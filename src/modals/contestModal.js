const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { chunkArray } = require("../utils/validators");
const { createApplicationTicket } = require("../services/contestService");
const { getModalText } = require("../utils/modalFields");
const { safeDefer } = require("../utils/interaction");
const { logError } = require("../utils/logger");

module.exports = {
  id: "contest:modal",
  async execute(client, interaction) {
    const step = parseInt(interaction.customId.split(":")[2], 10);
    const config = client.config;
    const questions = config.contest.questions;
    const chunks = chunkArray(questions, 5);

    if (!client.pendingContest) client.pendingContest = new Map();
    const session = client.pendingContest.get(interaction.user.id) ?? {
      answers: {},
      step: 0,
    };

    const chunk = chunks[step] ?? [];
    for (const q of chunk) {
      session.answers[q.id] = getModalText(interaction, q.id);
    }

    const nextStep = step + 1;

    if (nextStep < chunks.length) {
      client.pendingContest.set(interaction.user.id, {
        ...session,
        step: nextStep,
      });

      return interaction.reply({
        content:
          `✅ **Etapa ${step + 1}/${chunks.length} concluída!**\n` +
          `Clique em **Continuar** para preencher a próxima parte do formulário.`,
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`contest:continue:${nextStep}`)
              .setLabel(`Continuar (${nextStep + 1}/${chunks.length})`)
              .setStyle(ButtonStyle.Primary)
              .setEmoji("➡️"),
          ),
        ],
        ephemeral: true,
      });
    }

    client.pendingContest.delete(interaction.user.id);
    await safeDefer(interaction, true);

    try {
      const application = await createApplicationTicket(
        interaction.guild,
        config,
        interaction.user,
        session.answers,
      );

      const ticketMention = `<#${application.channel.id}>`;

      await interaction.editReply(
        `✅ **Candidatura realizada com sucesso!**

📋 Sua inscrição foi registrada e enviada para análise da equipe.

🎫 Acompanhe o andamento da sua candidatura através do ticket:

${ticketMention}

⚠️ Mantenha este ticket aberto e fique atento às mensagens da equipe avaliadora.

🔔 Todas as atualizações sobre aprovação, reprovação ou solicitações adicionais serão realizadas por meio deste canal.`,
      );
    } catch (err) {
      logError("contest:modal", err, { userId: interaction.user?.id, step });
      await interaction
        .editReply("❌ Erro ao registrar inscrição. Tente novamente.")
        .catch(() => {});
    }
  },
};
