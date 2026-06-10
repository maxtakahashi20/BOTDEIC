const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const { getSupabase } = require("../database/client");
const { getStaffRolesForCategory } = require("../utils/permissions");
const { sanitizeChannelName } = require("../utils/validators");
const { generateTranscriptHtml } = require("../utils/transcript");
const { logActivity } = require("./logService");
const { getCategoryLabel } = require("../utils/ticketCategories");

function buildTicketControls(ticketId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket:claim:${ticketId}`)
      .setLabel("Assumir Ticket")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🙋"),
    new ButtonBuilder()
      .setCustomId(`ticket:close:${ticketId}`)
      .setLabel("Fechar Ticket")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🔒"),
    new ButtonBuilder()
      .setCustomId(`ticket:adduser:${ticketId}`)
      .setLabel("Adicionar Usuário")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("➕"),
    new ButtonBuilder()
      .setCustomId(`ticket:removeuser:${ticketId}`)
      .setLabel("Remover Usuário")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("➖"),
    new ButtonBuilder()
      .setCustomId(`ticket:transcript:${ticketId}`)
      .setLabel("Transcrição")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("📄")
  );
}

async function getOpenTicketByUser(discordId) {
  const db = getSupabase();
  const { data } = await db
    .from("tickets")
    .select("*")
    .eq("opener_id", discordId)
    .eq("status", "open")
    .maybeSingle();

  return data;
}

async function getTicketByChannel(channelId) {
  const db = getSupabase();
  const { data } = await db
    .from("tickets")
    .select("*")
    .eq("channel_id", channelId)
    .maybeSingle();

  return data;
}

async function getTicketById(ticketId) {
  const db = getSupabase();
  const { data } = await db.from("tickets").select("*").eq("id", ticketId).maybeSingle();
  return data;
}

async function logTicketAction(ticketId, action, actorId, details = {}) {
  const db = getSupabase();
  await db.from("ticket_logs").insert({
    ticket_id: ticketId,
    action,
    actor_id: actorId,
    details
  });
  await logActivity({
    category: "ticket",
    action,
    actorId,
    targetId: ticketId,
    details
  });
}

async function createTicket(guild, config, opener, category) {
  const categoryId = config.channels?.ticketsCategory;
  if (!categoryId) throw new Error("ticketsCategory não configurado");

  const parent = await guild.channels.fetch(categoryId).catch(() => null);
  if (!parent) throw new Error("Categoria de tickets não encontrada");

  const staffRoleIds = getStaffRolesForCategory(config, category);
  const label = getCategoryLabel(config, category);

  const overwrites = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: opener.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles
      ]
    },
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

  for (const roleId of staffRoleIds) {
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

  const channelName = sanitizeChannelName(`ticket-${label}-${opener.username}`);
  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: parent.id,
    permissionOverwrites: overwrites,
    topic: `Ticket de ${opener.tag} — ${label}`
  });

  const db = getSupabase();
  const { data: ticket, error } = await db
    .from("tickets")
    .insert({
      channel_id: channel.id,
      opener_id: opener.id,
      category
    })
    .select()
    .single();

  if (error) {
    await channel.delete().catch(() => {});
    throw error;
  }

  await logTicketAction(ticket.id, "opened", opener.id, { category });

  const embed = new EmbedBuilder()
    .setTitle(`🎫 Ticket — ${label}`)
    .setDescription(
      `Olá ${opener}, bem-vindo ao seu ticket!\n\n` +
        `A equipe de **${label}** irá atendê-lo em breve.\n` +
        `Use os botões abaixo para gerenciar este ticket.`
    )
    .setColor(0x57f287)
    .setFooter({ text: `Ticket ID: ${ticket.id}` })
    .setTimestamp();

  await channel.send({
    content: `<@${opener.id}>`,
    embeds: [embed],
    components: [buildTicketControls(ticket.id)]
  });

  return { channel, ticket };
}

async function claimTicket(ticket, member) {
  const db = getSupabase();
  await db
    .from("tickets")
    .update({ claimed_by: member.id })
    .eq("id", ticket.id);

  await logTicketAction(ticket.id, "claimed", member.id);
  return member;
}

async function closeTicket(client, config, ticket, channel, closedBy) {
  const db = getSupabase();
  const html = await generateTranscriptHtml(channel, ticket);
  const buffer = Buffer.from(html, "utf8");

  const logsChannelId = config.channels?.ticketsLogs;
  if (logsChannelId) {
    const logsChannel = await client.channels.fetch(logsChannelId).catch(() => null);
    if (logsChannel?.isTextBased()) {
      const logEmbed = new EmbedBuilder()
        .setTitle("📄 Ticket Encerrado")
        .addFields(
          { name: "Categoria", value: getCategoryLabel(config, ticket.category), inline: true },
          { name: "Aberto por", value: `<@${ticket.opener_id}>`, inline: true },
          { name: "Fechado por", value: `<@${closedBy}>`, inline: true }
        )
        .setColor(0xed4245)
        .setTimestamp();

      await logsChannel.send({
        embeds: [logEmbed],
        files: [{ attachment: buffer, name: `transcript-${ticket.id}.html` }]
      });
    }
  }

  await db
    .from("tickets")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", ticket.id);

  await logTicketAction(ticket.id, "closed", closedBy);

  await channel.send(config.messages?.ticketClosed ?? "🔒 Ticket encerrado.");
  setTimeout(() => channel.delete().catch(() => {}), 5000);
}

module.exports = {
  buildTicketControls,
  getOpenTicketByUser,
  getTicketByChannel,
  getTicketById,
  createTicket,
  claimTicket,
  closeTicket,
  logTicketAction
};
