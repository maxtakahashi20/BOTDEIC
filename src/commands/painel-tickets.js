const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require("discord.js");
const { assertHasAnyRole } = require("../utils/permissions");
const { applyPanelFooter } = require("../utils/panelEmbed");
const { sendPanelToChannels } = require("../utils/panelSend");
const { buildCategorySelectOptions } = require("../utils/ticketCategories");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("painel-tickets")
    .setDescription("Envia o painel de tickets nos canais configurados."),

  async execute(client, interaction) {
    assertHasAnyRole(interaction, [
      ...(client.config.roles?.admin ?? []),
      ...client.config.allowedRoleIds
    ]);

    await interaction.deferReply({ ephemeral: true });

    const channelIds = client.config.channels?.ticketsPanel;
    if (!channelIds || (Array.isArray(channelIds) && !channelIds.length)) {
      return interaction.editReply("❌ `channels.ticketsPanel` não configurado.");
    }

    const panels = client.config.panels ?? {};
    const panel = panels.tickets ?? {};

    const embed = applyPanelFooter(
      new EmbedBuilder()
        .setTitle(panel.title ?? "Central de Atendimento")
        .setDescription(
          panel.description ??
            "Selecione a categoria abaixo para abrir um ticket privado com nossa equipe."
        )
        .setColor(panel.color ?? 0x5865f2),
      panel,
      panels
    );

    const select = new StringSelectMenuBuilder()
      .setCustomId("ticket:category")
      .setPlaceholder("Selecione o assunto do ticket")
      .addOptions(buildCategorySelectOptions(client.config));

    const payload = {
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(select)]
    };

    const { sent, failed } = await sendPanelToChannels(
      interaction.guild,
      channelIds,
      payload,
      ["ticket:category"]
    );

    if (!sent.length) {
      return interaction.editReply("❌ Nenhum canal de painel de tickets encontrado.");
    }

    const sentText = sent.map((id) => `<#${id}>`).join(", ");
    const failedText = failed.length
      ? `\n⚠️ Canais não encontrados: ${failed.map((id) => `\`${id}\``).join(", ")}`
      : "";

    await interaction.editReply(`✅ Painel de tickets enviado em ${sentText}.${failedText}`);
  }
};
