const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require("discord.js");
const { isAdmin } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("aviso")
    .setDescription("Envia um aviso administrativo com embed."),

  async execute(client, interaction) {
    if (!isAdmin(interaction, client.config)) {
      return interaction.reply({ content: "🚫 Sem permissão.", ephemeral: true });
    }

    const modal = new ModalBuilder().setCustomId("aviso:modal").setTitle("Enviar Aviso");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("title")
          .setLabel("Título")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(256)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("description")
          .setLabel("Descrição")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(4000)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("image")
          .setLabel("URL da Imagem (opcional)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("channel")
          .setLabel("ID do Canal")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("ID do canal de destino")
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("mention")
          .setLabel("Menção: everyone, here ou none")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("everyone | here | none")
      )
    );

    return interaction.showModal(modal);
  }
};
