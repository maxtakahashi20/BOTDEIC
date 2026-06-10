const { EmbedBuilder } = require("discord.js");
const { getTicketById, claimTicket } = require("../services/ticketService");
const { getStaffRolesForCategory, memberHasAnyRole, isAdmin } = require("../utils/permissions");

module.exports = {
  id: "ticket:claim",
  async execute(client, interaction) {
    const ticketId = interaction.customId.split(":")[2];
    const ticket = await getTicketById(ticketId);

    if (!ticket || ticket.status !== "open") {
      return interaction.reply({ content: "❌ Ticket não encontrado ou já fechado.", ephemeral: true });
    }

    const staffRoles = getStaffRolesForCategory(client.config, ticket.category);
    if (!memberHasAnyRole(interaction.member, staffRoles) && !isAdmin(interaction, client.config)) {
      return interaction.reply({ content: "🚫 Apenas a equipe pode assumir este ticket.", ephemeral: true });
    }

    await claimTicket(ticket, interaction.member);

    const embed = EmbedBuilder.from(interaction.message.embeds[0]).addFields({
      name: "🙋 Assumido por",
      value: `<@${interaction.user.id}>`,
      inline: true
    });

    await interaction.update({ embeds: [embed] });
  }
};
