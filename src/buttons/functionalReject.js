const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
const { getRequestById } = require("../services/functionalService");
const { canApproveFunctional } = require("../utils/permissions");

module.exports = {
  id: "functional:reject",
  async execute(client, interaction) {
    if (!canApproveFunctional(interaction, client.config)) {
      return interaction.reply({ content: "🚫 Sem permissão.", ephemeral: true });
    }

    const requestId = interaction.customId.split(":")[2];
    const request = await getRequestById(requestId);

    if (!request || request.status !== "pending") {
      return interaction.reply({ content: "❌ Solicitação inválida.", ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId(`functional:modal:reject:${requestId}`)
      .setTitle("Motivo da Recusa");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("reason")
          .setLabel("Motivo (opcional)")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setMaxLength(500)
      )
    );

    return interaction.showModal(modal);
  }
};
