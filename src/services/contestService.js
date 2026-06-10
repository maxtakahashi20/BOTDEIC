const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const { getSupabase } = require("../database/client");
const { sanitizeChannelName } = require("../utils/validators");
const { logActivity } = require("./logService");
const { setContestApproved } = require("./userService");
const { generateTranscriptHtml } = require("../utils/transcript");

const CONTEST_CLOSE_DELAY_MS = 10_000;

function buildQuestionLabels(config) {
  const map = new Map();
  for (const q of config?.contest?.questions ?? []) {
    map.set(q.id, q.question ?? q.label ?? q.id);
  }
  return map;
}

function buildApplicationEmbed(application, user, config) {
  const answers = application.answers ?? {};
  const labels = buildQuestionLabels(config);
  const fields = Object.entries(answers).map(([key, value]) => ({
    name: labels.get(key) ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    value: String(value).slice(0, 1024) || "—",
    inline: false
  }));

  return new EmbedBuilder()
    .setTitle("📋 Inscrição no Concurso")
    .setColor(0xfee75c)
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: "👤 Candidato", value: `<@${user.id}> (\`${user.username}\`)`, inline: false },
      ...fields
    )
    .setFooter({ text: `Inscrição ID: ${application.id}` })
    .setTimestamp();
}

function buildReviewButtons(applicationId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`contest:approve:${applicationId}`)
      .setLabel("Aprovar")
      .setStyle(ButtonStyle.Success)
      .setEmoji("✅"),
    new ButtonBuilder()
      .setCustomId(`contest:reject:${applicationId}`)
      .setLabel("Reprovar")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("❌")
  );
}

async function getPendingApplication(discordId) {
  const db = getSupabase();
  const { data } = await db
    .from("applications")
    .select("*")
    .eq("discord_id", discordId)
    .eq("status", "pending")
    .maybeSingle();

  return data;
}

async function createApplicationTicket(guild, config, user, answers) {
  const categoryId = config.channels?.ticketsCategory;
  if (!categoryId) throw new Error("ticketsCategory não configurado");

  const parent = await guild.channels.fetch(categoryId).catch(() => null);
  if (!parent) throw new Error("Categoria de tickets não encontrada");

  const evaluatorRoles = [
    ...(config.roles?.contestEvaluators ?? []),
    ...(config.roles?.admin ?? []),
    ...(config.roles?.ticketStaffGlobal ?? [])
  ];

  const nome = (answers.dados_pessoais ?? answers.nome_completo ?? user.username)
    .split("\n")[0]
    .trim()
    .slice(0, 32) || user.username;
  const channelName = sanitizeChannelName(`inscricao-${nome}`);

  const overwrites = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: user.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: guild.members.me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ReadMessageHistory
      ]
    }
  ];

  for (const roleId of [...new Set(evaluatorRoles)]) {
    if (!roleId) continue;
    overwrites.push({
      id: roleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages
      ]
    });
  }

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: parent.id,
    permissionOverwrites: overwrites,
    topic: `Inscrição de ${user.tag}`
  });

  const db = getSupabase();
  const { data: application, error } = await db
    .from("applications")
    .insert({
      discord_id: user.id,
      answers,
      channel_id: channel.id
    })
    .select()
    .single();

  if (error) {
    await channel.delete().catch(() => {});
    throw error;
  }

  await logActivity({
    category: "contest",
    action: "application_created",
    actorId: user.id,
    targetId: application.id,
    details: { channel_id: channel.id }
  });

  const embed = buildApplicationEmbed(application, user, config);
  await channel.send({
    embeds: [embed],
    components: [buildReviewButtons(application.id)]
  });

  return { channel, application };
}

async function closeApplicationChannel(client, config, application, closedBy, outcome) {
  if (!application.channel_id) return;

  const channel = await client.channels.fetch(application.channel_id).catch(() => null);
  if (!channel?.isTextBased()) return;

  const transcriptMeta = {
    id: application.id,
    category: "Inscrição — Concurso",
    opener_id: application.discord_id,
    created_at: application.created_at ?? new Date().toISOString()
  };

  const html = await generateTranscriptHtml(channel, transcriptMeta);
  const buffer = Buffer.from(html, "utf8");

  const logsChannelId = config.channels?.ticketsLogs ?? config.channels?.generalLogs;
  if (logsChannelId) {
    const logsChannel = await client.channels.fetch(logsChannelId).catch(() => null);
    if (logsChannel?.isTextBased()) {
      const approved = outcome === "approved";
      const logEmbed = new EmbedBuilder()
        .setTitle(approved ? "✅ Inscrição Aprovada — Canal Encerrado" : "❌ Inscrição Reprovada — Canal Encerrado")
        .addFields(
          { name: "Candidato", value: `<@${application.discord_id}>`, inline: true },
          { name: "Processado por", value: `<@${closedBy}>`, inline: true },
          { name: "Inscrição ID", value: application.id, inline: false }
        )
        .setColor(approved ? 0x57f287 : 0xed4245)
        .setTimestamp();

      await logsChannel.send({
        embeds: [logEmbed],
        files: [{ attachment: buffer, name: `transcript-inscricao-${application.id}.html` }]
      });
    }
  }

  await logActivity({
    category: "contest",
    action: `channel_closed_${outcome}`,
    actorId: closedBy,
    targetId: application.discord_id,
    details: { application_id: application.id, channel_id: application.channel_id }
  });

  const closingMsg =
    config.messages?.contestChannelClosing ??
    "🔒 Este canal de inscrição será fechado em 10 segundos.";
  await channel.send(closingMsg).catch(() => {});

  setTimeout(() => channel.delete().catch(() => {}), CONTEST_CLOSE_DELAY_MS);
}

async function approveApplication(client, config, application, reviewer) {
  const db = getSupabase();
  const userId = application.discord_id;

  await db
    .from("applications")
    .update({
      status: "approved",
      reviewed_by: reviewer.id,
      reviewed_at: new Date().toISOString()
    })
    .eq("id", application.id);

  await setContestApproved(userId, true);

  await db.from("approvals").insert({
    type: "contest",
    reference_id: application.id,
    discord_id: userId,
    action: "approved",
    responsible_id: reviewer.id,
    metadata: { answers: application.answers }
  });

  await logActivity({
    category: "contest",
    action: "approved",
    actorId: reviewer.id,
    targetId: userId,
    details: { application_id: application.id }
  });

  const guild = await client.guilds.fetch(config.guildId);
  const member = await guild.members.fetch(userId).catch(() => null);

  const roleIds = [
    config.roles?.contestApprovedRole,
    ...(config.onContestApprove?.roleIds ?? [])
  ].filter(Boolean);

  if (member && roleIds.length) {
    const roles = await Promise.all(
      roleIds.map((id) => guild.roles.fetch(id).catch(() => null))
    );
    const addable = roles.filter((r) => r?.editable);
    if (addable.length) {
      await member.roles.add(addable.map((r) => r.id), "Concurso aprovado").catch(() => {});
    }
  }

  try {
    const user = await client.users.fetch(userId);
    await user.send(config.messages?.contestApprovedDm ?? "✅ Inscrição aprovada!");
  } catch {
    // DM fechada
  }

  await closeApplicationChannel(client, config, application, reviewer.id, "approved");

  return true;
}

async function rejectApplication(client, config, application, reviewer) {
  const db = getSupabase();

  await db
    .from("applications")
    .update({
      status: "rejected",
      reviewed_by: reviewer.id,
      reviewed_at: new Date().toISOString()
    })
    .eq("id", application.id);

  await db.from("approvals").insert({
    type: "contest",
    reference_id: application.id,
    discord_id: application.discord_id,
    action: "rejected",
    responsible_id: reviewer.id
  });

  await logActivity({
    category: "contest",
    action: "rejected",
    actorId: reviewer.id,
    targetId: application.discord_id,
    details: { application_id: application.id }
  });

  try {
    const user = await client.users.fetch(application.discord_id);
    await user.send(config.messages?.contestRejectedDm ?? "❌ Inscrição reprovada.");
  } catch {
    // DM fechada
  }

  await closeApplicationChannel(client, config, application, reviewer.id, "rejected");
}

async function getApplicationById(id) {
  const db = getSupabase();
  const { data } = await db.from("applications").select("*").eq("id", id).maybeSingle();
  return data;
}

module.exports = {
  buildApplicationEmbed,
  buildReviewButtons,
  getPendingApplication,
  createApplicationTicket,
  approveApplication,
  rejectApplication,
  getApplicationById
};
