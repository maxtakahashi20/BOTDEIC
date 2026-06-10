const { getOpenTicketByUser, createTicket } = require("../services/ticketService");

module.exports = {
  id: "ticket:category",
  async execute(client, interaction) {
    const category = interaction.values[0];
    const config = client.config;

    const existing = await getOpenTicketByUser(interaction.user.id);
    if (existing) {
      return interaction.reply({
        content: `⚠️ Você já possui um ticket aberto: <#${existing.channel_id}>`,
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const { channel } = await createTicket(interaction.guild, config, interaction.user, category);
      const msg = (config.messages?.ticketCreated ?? "✅ Ticket criado: {channel}").replace(
        "{channel}",
        `<#${channel.id}>`
      );
      await interaction.editReply(msg);
    } catch (err) {
      console.error("[ticket:category]", err);
      await interaction.editReply("❌ Não foi possível criar o ticket. Verifique a configuração.");
    }
  }
};
