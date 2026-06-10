const { getTicketById, closeTicket } = require("../services/ticketService");
const { getStaffRolesForCategory, memberHasAnyRole, isAdmin } = require("../utils/permissions");

module.exports = {
  id: "ticket:close",
  async execute(client, interaction) {
    const ticketId = interaction.customId.split(":")[2];
    const ticket = await getTicketById(ticketId);

    if (!ticket || ticket.status !== "open") {
      return interaction.reply({ content: "❌ Ticket não encontrado ou já fechado.", ephemeral: true });
    }

    const staffRoles = getStaffRolesForCategory(client.config, ticket.category);
    const canClose =
      ticket.opener_id === interaction.user.id ||
      memberHasAnyRole(interaction.member, staffRoles) ||
      isAdmin(interaction, client.config);

    if (!canClose) {
      return interaction.reply({ content: "🚫 Sem permissão para fechar este ticket.", ephemeral: true });
    }

    await interaction.deferUpdate();
    await closeTicket(client, client.config, ticket, interaction.channel, interaction.user.id);
  }
};
