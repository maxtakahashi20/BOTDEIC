const { buildContestModal } = require("./contestRegister");
const { chunkArray } = require("../utils/validators");

module.exports = {
  id: "contest:continue",
  async execute(client, interaction) {
    const step = parseInt(interaction.customId.split(":")[2], 10);
    const session = client.pendingContest?.get(interaction.user.id);

    if (!session?.answers) {
      return interaction.reply({
        content: "❌ Sessão expirada. Clique em **INSCREVER-SE NO CONCURSO** novamente.",
        ephemeral: true
      });
    }

    const chunks = chunkArray(client.config.contest.questions, 5);
    if (Number.isNaN(step) || step < 0 || step >= chunks.length) {
      return interaction.reply({
        content: "❌ Etapa inválida. Inicie a inscrição novamente.",
        ephemeral: true
      });
    }

    try {
      return await interaction.showModal(buildContestModal(client.config, step));
    } catch (err) {
      console.error("[contest:continue]", err);
      return interaction.reply({
        content: "❌ Não foi possível abrir a próxima etapa. Tente novamente.",
        ephemeral: true
      });
    }
  }
};
