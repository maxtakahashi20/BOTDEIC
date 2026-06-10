const { EmbedBuilder } = require("discord.js");
const { getApplicationById, approveApplication } = require("../services/contestService");
const { canEvaluateContest } = require("../utils/permissions");
const { logAndNotify } = require("../services/logService");

module.exports = {
  id: "contest:approve",
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

    await approveApplication(client, client.config, application, interaction.user);

    const embed = EmbedBuilder.from(interaction.message.embeds[0])
      .setColor(0x57f287)
      .setFooter({ text: `✅ Aprovado por ${interaction.user.username}` });

    await interaction.message.edit({ embeds: [embed], components: [] });

    await logAndNotify(
      client,
      client.config,
      {
        category: "contest",
        action: "approved",
        actorId: interaction.user.id,
        targetId: application.discord_id,
        details: { application_id: appId }
      },
      {
        title: "✅ Concurso — Aprovação",
        description: `<@${application.discord_id}> aprovado por <@${interaction.user.id}>`,
        color: 0x57f287
      }
    );

    await interaction.followUp({
      content: `✅ Inscrição aprovada para <@${application.discord_id}>.`,
      ephemeral: true
    });
  }
};
