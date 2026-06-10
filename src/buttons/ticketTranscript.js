const { AttachmentBuilder } = require("discord.js");
const { getTicketById } = require("../services/ticketService");
const { generateTranscriptHtml } = require("../utils/transcript");
const { getStaffRolesForCategory, memberHasAnyRole, isAdmin } = require("../utils/permissions");

module.exports = {
  id: "ticket:transcript",
  async execute(client, interaction) {
    const ticketId = interaction.customId.split(":")[2];
    const ticket = await getTicketById(ticketId);

    if (!ticket) {
      return interaction.reply({ content: "❌ Ticket não encontrado.", ephemeral: true });
    }

    const staffRoles = getStaffRolesForCategory(client.config, ticket.category);
    if (!memberHasAnyRole(interaction.member, staffRoles) && !isAdmin(interaction, client.config)) {
      return interaction.reply({ content: "🚫 Sem permissão.", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const html = await generateTranscriptHtml(interaction.channel, ticket);
    const file = new AttachmentBuilder(Buffer.from(html, "utf8"), {
      name: `transcript-${ticket.id}.html`
    });

    await interaction.editReply({ content: "📄 Transcrição gerada:", files: [file] });
  }
};
