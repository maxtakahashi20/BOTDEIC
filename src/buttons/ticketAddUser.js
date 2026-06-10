const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
const { getTicketById } = require("../services/ticketService");
const { getStaffRolesForCategory, memberHasAnyRole, isAdmin } = require("../utils/permissions");

module.exports = {
  id: "ticket:adduser",
  async execute(client, interaction) {
    const ticketId = interaction.customId.split(":")[2];
    const ticket = await getTicketById(ticketId);

    if (!ticket || ticket.status !== "open") {
      return interaction.reply({ content: "❌ Ticket inválido.", ephemeral: true });
    }

    const staffRoles = getStaffRolesForCategory(client.config, ticket.category);
    if (!memberHasAnyRole(interaction.member, staffRoles) && !isAdmin(interaction, client.config)) {
      return interaction.reply({ content: "🚫 Sem permissão.", ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId(`ticket:modal:adduser:${ticketId}`)
      .setTitle("Adicionar Usuário ao Ticket");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("user_id")
          .setLabel("ID do usuário Discord")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("Ex: 123456789012345678")
      )
    );

    return interaction.showModal(modal);
  }
};
