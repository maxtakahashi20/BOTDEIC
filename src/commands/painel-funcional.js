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
  if (style === "Primary") return ButtonStyle.Primary;
  if (style === "Success") return ButtonStyle.Success;
  if (style === "Danger") return ButtonStyle.Danger;
  return ButtonStyle.Secondary;
}

function buildFunctionalEmbed(panel, panelsConfig) {
  const requirements = (panel.requirements ?? [])
    .map((item) => `• ${item}`)
    .join("\n");

  const requirementsBlock = [
    panel.requirementsTitle ?? "É necessário ter em mãos o seu:",
    requirements
  ].join("\n");

  const embed = new EmbedBuilder()
    .setTitle(panel.title ?? "DEIC | Solicitar funcional")
    .setDescription(
      `${panel.intro ?? ""}\n\n\`\`\`\n${requirementsBlock}\n\`\`\``
    )
    .setColor(panel.color ?? 0x959595);

  return applyPanelFooter(embed, panel, panelsConfig);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("painel-funcional")
    .setDescription("Envia o painel de solicitação de funcional."),

  async execute(client, interaction) {
    assertHasAnyRole(interaction, [
      ...(client.config.roles?.admin ?? []),
      ...client.config.allowedRoleIds
    ]);

    await interaction.deferReply({ ephemeral: true });

    const channelId = client.config.channels?.functionalPanel;
    if (!channelId) {
      return interaction.editReply("❌ `channels.functionalPanel` não configurado.");
    }

    const panels = client.config.panels ?? {};
    const panel = panels.functional ?? {};
    const embed = buildFunctionalEmbed(panel, panels);

    const requestBtn = new ButtonBuilder()
      .setCustomId("functional:request")
      .setLabel(panel.buttonLabel ?? "SOLICITAR FUNCIONAL DEIC")
      .setStyle(resolveButtonStyle(panel.buttonStyle ?? "Secondary"));

    if (panel.buttonEmoji) requestBtn.setEmoji(panel.buttonEmoji);

    const directBtn = new ButtonBuilder()
      .setCustomId("functional:direct")
      .setLabel(panel.directButtonLabel ?? "CONVITE DIRETO")
      .setStyle(resolveButtonStyle(panel.directButtonStyle ?? "Primary"));

    if (panel.directButtonEmoji) directBtn.setEmoji(panel.directButtonEmoji);

    const row = new ActionRowBuilder().addComponents(requestBtn, directBtn);

    const { sent, failed } = await sendPanelToChannels(
      interaction.guild,
      channelId,
      { embeds: [embed], components: [row] },
      ["functional:request", "functional:direct"]
    );

    if (!sent.length) {
      return interaction.editReply("❌ Canal do painel funcional não encontrado.");
    }

    const failedText = failed.length ? ` ⚠️ Canal inválido: \`${failed[0]}\`.` : "";
    await interaction.editReply(`✅ Painel funcional enviado em <#${sent[0]}>.${failedText}`);
  }
};
