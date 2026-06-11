const { EmbedBuilder } = require("discord.js");
const { getRequestById, rejectFunctional } = require("../services/functionalService");
const { logAndNotify } = require("../services/logService");
const { safeDefer } = require("../utils/interaction");
const { logError } = require("../utils/logger");

module.exports = {
  id: "functional:modal:reject",
  async execute(client, interaction) {
    await safeDefer(interaction, true);

    try {
      const requestId = interaction.customId.split(":")[3];
      const reason = interaction.fields.getTextInputValue("reason")?.trim() || null;
      const request = await getRequestById(requestId);

      if (!request || request.status !== "pending") {
        return interaction.editReply("❌ Solicitação inválida.");
      }

      await rejectFunctional(client, client.config, request, interaction.user, reason);

      const channelId = client.config.channels?.functionalRequests;
      if (channelId && request.message_id) {
        const channel = await client.channels.fetch(channelId).catch(() => null);
        const msg = await channel?.messages.fetch(request.message_id).catch(() => null);
        if (msg?.embeds[0]) {
          const embed = EmbedBuilder.from(msg.embeds[0])
            .setColor(0xed4245)
            .setFooter({ text: `❌ Recusado por ${interaction.user.username}` });
          await msg.edit({ embeds: [embed], components: [] }).catch(() => {});
        }
      }

      await logAndNotify(
        client,
        client.config,
        {
          category: "functional",
          action: "rejected",
          actorId: interaction.user.id,
          targetId: request.discord_id,
          details: { request_id: requestId, reason }
        },
        {
          title: "❌ Funcional — Recusa",
          description: `<@${request.discord_id}> recusado por <@${interaction.user.id}>`,
          color: 0xed4245,
          fields: reason ? [{ name: "Motivo", value: reason }] : []
        }
      );

      await interaction.editReply(`❌ Solicitação recusada para <@${request.discord_id}>.`);
    } catch (err) {
      logError("functional:modal:reject", err, { userId: interaction.user?.id });
      await interaction.editReply("❌ Erro ao recusar solicitação.").catch(() => {});
    }
  }
};
