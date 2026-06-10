const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const { assertHasAnyRole } = require("../utils/permissions");
const { applyPanelFooter } = require("../utils/panelEmbed");
const { sendPanelToChannels } = require("../utils/panelSend");

function resolveButtonStyle(style) {
  if (style === "Secondary") return ButtonStyle.Secondary;
  if (style === "Success") return ButtonStyle.Success;
  if (style === "Danger") return ButtonStyle.Danger;
  return ButtonStyle.Primary;
}

function buildContestEmbed(panel, panelsConfig) {
  const instructions = (panel.instructions ?? [])
    .map((item) => `• ${item}`)
    .join("\n");

  const description = [
    `**${panel.subtitle ?? "FORMULÁRIO DE INSCRIÇÃO — DEIC"}**`,
    "",
    `*"${panel.motto ?? ""}"*`,
    "",
    `**${panel.instructionsTitle ?? "Como se inscrever:"}**`,
    instructions
  ].join("\n");

  const embed = new EmbedBuilder()
    .setTitle(panel.title ?? "📢 Concurso de Ingresso - DEIC")
    .setDescription(description)
    .setColor(panel.color ?? 0x3498db)
    .setTimestamp();

  return applyPanelFooter(
    embed,
    { ...panel, footer: panel.footer ? `• ${panel.footer}` : panel.footer },
    panelsConfig
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("painel-concurso")
    .setDescription("Envia o painel de inscrição no concurso."),

  async execute(client, interaction) {
    assertHasAnyRole(interaction, [
      ...(client.config.roles?.admin ?? []),
      ...client.config.allowedRoleIds
    ]);

    await interaction.deferReply({ ephemeral: true });

    const channelId = client.config.channels?.contestPanel;
    if (!channelId) {
      return interaction.editReply("❌ `channels.contestPanel` não configurado.");
    }

    const panels = client.config.panels ?? {};
    const panel = panels.contest ?? {};
    const embed = buildContestEmbed(panel, panels);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("contest:register")
        .setLabel(panel.buttonLabel ?? "INSCREVER-SE NO CONCURSO")
        .setStyle(resolveButtonStyle(panel.buttonStyle ?? "Primary"))
    );

    const { sent, failed } = await sendPanelToChannels(
      interaction.guild,
      channelId,
      { embeds: [embed], components: [row] },
      ["contest:register"]
    );

    if (!sent.length) {
      return interaction.editReply("❌ Canal do painel de concurso não encontrado.");
    }

    const failedText = failed.length ? ` ⚠️ Canal inválido: \`${failed[0]}\`.` : "";
    await interaction.editReply(`✅ Painel de concurso enviado em <#${sent[0]}>.${failedText}`);
  }
};
