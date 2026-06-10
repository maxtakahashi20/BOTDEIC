const { getTicketById, logTicketAction } = require("../services/ticketService");
const { getModalText } = require("../utils/modalFields");
const { safeDefer } = require("../utils/interaction");

module.exports = {
  id: "ticket:modal",
  async execute(client, interaction) {
    await safeDefer(interaction, true);

    try {
      const parts = interaction.customId.split(":");
      const action = parts[2];
      const ticketId = parts[3];
      const userId = getModalText(interaction, "user_id").trim();

      if (!userId) {
        return interaction.editReply("❌ Informe o ID do usuário.");
      }

      const ticket = await getTicketById(ticketId);
      if (!ticket || ticket.status !== "open") {
        return interaction.editReply("❌ Ticket inválido.");
      }

      const member = await interaction.guild.members.fetch(userId).catch(() => null);
      if (!member) {
        return interaction.editReply("❌ Usuário não encontrado no servidor.");
      }

      if (action === "adduser") {
        await interaction.channel.permissionOverwrites.edit(member.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        });
        await logTicketAction(ticketId, "user_added", interaction.user.id, { user_id: userId });
        return interaction.editReply(`✅ <@${userId}> adicionado ao ticket.`);
      }

      if (action === "removeuser") {
        await interaction.channel.permissionOverwrites.edit(member.id, {
          ViewChannel: false
        });
        await logTicketAction(ticketId, "user_removed", interaction.user.id, { user_id: userId });
        return interaction.editReply(`✅ <@${userId}> removido do ticket.`);
      }

      await interaction.editReply("❌ Ação inválida.");
    } catch (err) {
      console.error("[ticket:modal]", err);
      await interaction.editReply("❌ Erro ao processar. Tente novamente.").catch(() => {});
    }
  }
};
