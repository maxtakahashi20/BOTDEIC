const { EmbedBuilder } = require("discord.js");
const { getSupabase } = require("../database/client");
const { validateAndUseCode } = require("./codeService");
const { isContestApproved } = require("./userService");
const { logActivity } = require("./logService");
const { buildNicknameFromTemplate } = require("../utils/nickname");

function buildRequestEmbed(request, user, options = {}) {
  const fields = [
    { name: "👤 Usuário", value: `<@${user.id}>`, inline: false },
    { name: "🪪 Nome", value: request.full_name, inline: true },
    { name: "🆔 ID na Cidade", value: request.city_id, inline: true },
    { name: "🏢 Unidade", value: request.unit, inline: true },
    { name: "⭐ Cargo", value: request.rank, inline: true },
    { name: "🔑 Código", value: `\`${request.code_display ?? "—"}\``, inline: true }
  ];

  if (options.directInvite) {
    fields.unshift({ name: "📌 Tipo", value: "Convite Direto", inline: true });
  }

  return new EmbedBuilder()
    .setTitle("📋 Nova Solicitação de Funcional")
    .setColor(0xfee75c)
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .addFields(fields)
    .setFooter({ text: `Solicitação ID: ${request.id}` })
    .setTimestamp();
}

function buildReviewButtons(requestId) {
  const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`functional:approve:${requestId}`)
      .setLabel("Aprovar")
      .setStyle(ButtonStyle.Success)
      .setEmoji("✅"),
    new ButtonBuilder()
      .setCustomId(`functional:reject:${requestId}`)
      .setLabel("Recusar")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("❌")
  );
}

async function submitFunctionalRequest(guild, config, user, data, options = {}) {
  try {
    if (!options.skipContestCheck) {
      const approved = await isContestApproved(user.id);
      if (!approved) {
        return { ok: false, reason: "not_approved" };
      }
    }

    const codeResult = await validateAndUseCode(data.authCode, user.id);
    if (!codeResult.valid) {
      return { ok: false, reason: "invalid_code" };
    }

    const db = getSupabase();
    const { data: request, error } = await db
      .from("functional_requests")
      .insert({
        discord_id: user.id,
        full_name: data.fullName,
        city_id: data.cityId,
        unit: data.unit,
        rank: data.rank,
        auth_code_id: codeResult.row.id
      })
      .select()
      .single();

    if (error) {
      console.error("[submitFunctionalRequest] insert", error);
      return { ok: false, reason: "db_error" };
    }

    request.code_display = codeResult.row.code;

    const channelId = config.channels?.functionalRequests;
    if (!channelId) {
      console.error("[submitFunctionalRequest] functionalRequests não configurado");
      return { ok: false, reason: "config_error" };
    }

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased()) {
      console.error("[submitFunctionalRequest] canal de solicitações não encontrado");
      return { ok: false, reason: "config_error" };
    }

    const embed = buildRequestEmbed(request, user, { directInvite: options.skipContestCheck });
    const notifyRoles = config.roles?.functionalNotifyRoles ?? [];
    const mention = notifyRoles.map((id) => `<@&${id}>`).join(" ");

    const msg = await channel.send({
      content: mention || undefined,
      embeds: [embed],
      components: [buildReviewButtons(request.id)]
    });

    db.from("functional_requests")
      .update({ message_id: msg.id })
      .eq("id", request.id)
      .then(() => {})
      .catch((err) => console.error("[submitFunctionalRequest] update message_id", err));

    logActivity({
      category: "functional",
      action: "request_submitted",
      actorId: user.id,
      targetId: request.id,
      details: {
        unit: data.unit,
        rank: data.rank,
        code: codeResult.row.code,
        direct_invite: !!options.skipContestCheck
      }
    }).catch((err) => console.error("[submitFunctionalRequest] log", err));

    logActivity({
      category: "code",
      action: "code_used",
      actorId: user.id,
      targetId: codeResult.row.id,
      details: { code: codeResult.row.code }
    }).catch((err) => console.error("[submitFunctionalRequest] log code", err));

    return { ok: true, request };
  } catch (err) {
    console.error("[submitFunctionalRequest]", err);
    return { ok: false, reason: "db_error" };
  }
}

async function getRequestById(id) {
  const db = getSupabase();
  const { data } = await db.from("functional_requests").select("*").eq("id", id).maybeSingle();
  return data;
}

async function approveFunctional(client, config, request, reviewer) {
  const db = getSupabase();
  const guild = await client.guilds.fetch(config.guildId);
  const member = await guild.members.fetch(request.discord_id).catch(() => null);

  const roleIds = new Set([
    config.unitRoles?.[request.unit],
    config.rankRoles?.[request.rank],
    config.roles?.activeFunctionalRole,
    ...(config.onFunctionalApprove?.extraRoleIds ?? [])
  ].filter(Boolean));

  const changes = [];

  if (member) {
    const template = config.onFunctionalApprove?.nicknameTemplate ?? "{nome} | {id}";
    const nickname = buildNicknameFromTemplate(template, request);

    try {
      await member.setNickname(nickname, "Funcional aprovada");
      changes.push(`Apelido definido: **${nickname}**`);
      await logActivity({
        category: "functional",
        action: "nickname_changed",
        actorId: reviewer.id,
        targetId: request.discord_id,
        details: { nickname, template }
      });
    } catch (err) {
      console.error("[approveFunctional] setNickname", err);
      if (err?.code === 50013) {
        changes.push(
          "Apelido não alterado: bot sem permissão ou abaixo do membro na hierarquia."
        );
      } else {
        changes.push(`Apelido não alterado: ${err?.message ?? "erro desconhecido"}`);
      }
    }

    if (roleIds.size) {
      const roles = await Promise.all(
        [...roleIds].map((id) => guild.roles.fetch(id).catch(() => null))
      );
      const addable = roles.filter((r) => r?.editable);
      if (addable.length) {
        await member.roles.add(addable.map((r) => r.id), "Funcional aprovada").catch(() => {});
        changes.push(`Cargos: ${addable.map((r) => r.name).join(", ")}`);
      }
    }
  }

  await db
    .from("functional_requests")
    .update({
      status: "approved",
      reviewed_by: reviewer.id,
      reviewed_at: new Date().toISOString()
    })
    .eq("id", request.id);

  await db.from("approvals").insert({
    type: "functional",
    reference_id: request.id,
    discord_id: request.discord_id,
    action: "approved",
    responsible_id: reviewer.id,
    metadata: { unit: request.unit, rank: request.rank, changes }
  });

  await logActivity({
    category: "functional",
    action: "approved",
    actorId: reviewer.id,
    targetId: request.discord_id,
    details: { request_id: request.id }
  });

  try {
    const user = await client.users.fetch(request.discord_id);
    const nicknameLine = changes.find((c) => c.startsWith("Apelido definido"))
      ? `\n\nSeu apelido no servidor foi atualizado conforme aprovação.`
      : "";
    const base = config.messages?.functionalApprovedDm ?? "✅ Funcional aprovada!";
    await user.send(`${base}${nicknameLine}`);
  } catch {
    // DM fechada
  }

  return changes;
}

async function rejectFunctional(client, config, request, reviewer, reason) {
  const db = getSupabase();

  await db
    .from("functional_requests")
    .update({
      status: "rejected",
      reviewed_by: reviewer.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason ?? null
    })
    .eq("id", request.id);

  await db.from("approvals").insert({
    type: "functional",
    reference_id: request.id,
    discord_id: request.discord_id,
    action: "rejected",
    responsible_id: reviewer.id,
    metadata: { reason }
  });

  await logActivity({
    category: "functional",
    action: "rejected",
    actorId: reviewer.id,
    targetId: request.discord_id,
    details: { request_id: request.id, reason }
  });

  try {
    const user = await client.users.fetch(request.discord_id);
    const msg = config.messages?.functionalRejectedDm ?? "❌ Funcional recusada.";
    await user.send(reason ? `${msg}\n\n**Motivo:** ${reason}` : msg);
  } catch {
    // DM fechada
  }
}

module.exports = {
  buildRequestEmbed,
  buildReviewButtons,
  submitFunctionalRequest,
  getRequestById,
  approveFunctional,
  rejectFunctional
};
