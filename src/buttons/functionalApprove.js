const { EmbedBuilder } = require("discord.js");
const { getRequestById, approveFunctional } = require("../services/functionalService");
const { canApproveFunctional } = require("../utils/permissions");
const { logAndNotify } = require("../services/logService");

module.exports = {
  id: "functional:approve",
  async execute(client, interaction) {
    if (!canApproveFunctional(interaction, client.config)) {
      return interaction.reply({ content: "🚫 Sem permissão.", ephemeral: true });
    }

    const requestId = interaction.customId.split(":")[2];
    const request = await getRequestById(requestId);

    if (!request || request.status !== "pending") {
      return interaction.reply({ content: "❌ Solicitação inválida ou já processada.", ephemeral: true });
    }

    await interaction.deferUpdate();

    const changes = await approveFunctional(client, client.config, request, interaction.user);

    const embed = EmbedBuilder.from(interaction.message.embeds[0])
      .setColor(0x57f287)
      .setFooter({ text: `✅ Aprovado por ${interaction.user.username}` });

    await interaction.message.edit({ embeds: [embed], components: [] });

    await logAndNotify(
      client,
      client.config,
      {
        category: "functional",
        action: "approved",
        actorId: interaction.user.id,
        targetId: request.discord_id,
        details: { request_id: requestId, changes }
      },
      {
        title: "✅ Funcional — Aprovação",
        description: `<@${request.discord_id}> aprovado por <@${interaction.user.id}>`,
        color: 0x57f287,
        fields: changes.map((c) => ({ name: "Alteração", value: c, inline: false }))
      }
    );

    const changesText = changes.length ? `\n\n${changes.join("\n")}` : "";
    await interaction.followUp({
      content: `✅ Funcional aprovada para <@${request.discord_id}>.${changesText}`,
      ephemeral: true
    });
  }
};
