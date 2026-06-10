const { EmbedBuilder } = require("discord.js");
const { getApplicationById, rejectApplication } = require("../services/contestService");
const { canEvaluateContest } = require("../utils/permissions");
const { logAndNotify } = require("../services/logService");

module.exports = {
  id: "contest:reject",
  async execute(client, interaction) {
    if (!canEvaluateContest(interaction, client.config)) {
      return interaction.reply({ content: "🚫 Sem permissão.", ephemeral: true });
    }

    const appId = interaction.customId.split(":")[2];
    const application = await getApplicationById(appId);

    if (!application || application.status !== "pending") {
      return interaction.reply({ content: "❌ Inscrição inválida ou já processada.", ephemeral: true });
    }

    await interaction.deferUpdate();

    await rejectApplication(client, client.config, application, interaction.user);

    const embed = EmbedBuilder.from(interaction.message.embeds[0])
      .setColor(0xed4245)
      .setFooter({ text: `❌ Reprovado por ${interaction.user.username}` });

    await interaction.message.edit({ embeds: [embed], components: [] });

    await logAndNotify(
      client,
      client.config,
      {
        category: "contest",
        action: "rejected",
        actorId: interaction.user.id,
        targetId: application.discord_id,
        details: { application_id: appId }
      },
      {
        title: "❌ Concurso — Reprovação",
        description: `<@${application.discord_id}> reprovado por <@${interaction.user.id}>`,
        color: 0xed4245
      }
    );

    await interaction.followUp({
      content: `❌ Inscrição reprovada para <@${application.discord_id}>.`,
      ephemeral: true
    });
  }
};
