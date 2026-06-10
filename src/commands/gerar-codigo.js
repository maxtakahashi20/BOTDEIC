const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { canGenerateCode } = require("../utils/permissions");
const { createCode } = require("../services/codeService");
const { logAndNotify } = require("../services/logService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gerar_codigo")
    .setDescription("Gera um código de autorização para funcional."),

  async execute(client, interaction) {
    if (!canGenerateCode(interaction, client.config)) {
      return interaction.reply({
        content: "🚫 Você não tem permissão para gerar códigos.",
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const prefix = client.config.codePrefix ?? "PM";
    const codeRow = await createCode(interaction.user.id, prefix);

    const embed = new EmbedBuilder()
      .setTitle("🔑 Código de Autorização Gerado")
      .setDescription(`Código: \`${codeRow.code}\``)
      .addFields(
        { name: "Gerado por", value: `<@${interaction.user.id}>`, inline: true },
        { name: "Validade", value: "Uso único", inline: true }
      )
      .setColor(0x57f287)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    await logAndNotify(
      client,
      client.config,
      {
        category: "code",
        action: "code_generated",
        actorId: interaction.user.id,
        details: { code: codeRow.code, code_id: codeRow.id }
      },
      {
        title: "🔑 Código Gerado",
        description: `\`${codeRow.code}\` gerado por <@${interaction.user.id}>`,
        color: 0x57f287
      }
    );
  }
};
