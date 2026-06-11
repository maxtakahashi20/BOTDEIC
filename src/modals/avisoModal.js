const { EmbedBuilder } = require("discord.js");
const { getSupabase } = require("../database/client");
const { logAndNotify } = require("../services/logService");
const { isAdmin } = require("../utils/permissions");
const { safeDefer } = require("../utils/interaction");
const { logError } = require("../utils/logger");

const MENTION_MAP = {
  everyone: (content) => ({ content: `@everyone\n${content}`, type: "everyone" }),
  here: (content) => ({ content: `@here\n${content}`, type: "here" }),
  none: (content) => ({ content, type: "none" })
};

module.exports = {
  id: "aviso:modal",
  async execute(client, interaction) {
    if (!isAdmin(interaction, client.config)) {
      return interaction.reply({ content: "🚫 Sem permissão.", ephemeral: true });
    }

    await safeDefer(interaction, true);

    try {
      const title = interaction.fields.getTextInputValue("title").trim();
      const description = interaction.fields.getTextInputValue("description").trim();
      const imageUrl = interaction.fields.getTextInputValue("image")?.trim() || null;
      const channelId = interaction.fields.getTextInputValue("channel").trim();
      const mentionKey = interaction.fields.getTextInputValue("mention").trim().toLowerCase();

      const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
      if (!channel?.isTextBased()) {
        return interaction.editReply("❌ Canal inválido. Informe o ID de um canal de texto.");
      }

      const mentionFn = MENTION_MAP[mentionKey] ?? MENTION_MAP.none;

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(0x5865f2)
        .setTimestamp()
        .setFooter({ text: `Aviso enviado por ${interaction.user.username}` });

      if (imageUrl) embed.setImage(imageUrl);

      const { content, type } = mentionFn("");

      await channel.send({ content: content || undefined, embeds: [embed] });

      const db = getSupabase();
      await db.from("warnings").insert({
        title,
        description,
        image_url: imageUrl,
        channel_id: channelId,
        mention_type: type,
        sent_by: interaction.user.id
      });

      await logAndNotify(
        client,
        client.config,
        {
          category: "warning",
          action: "sent",
          actorId: interaction.user.id,
          details: { channel_id: channelId, title, mention_type: type }
        },
        {
          title: "📢 Aviso Enviado",
          description: `**${title}** enviado em <#${channelId}> por <@${interaction.user.id}>`,
          color: 0x5865f2
        }
      );

      await interaction.editReply(`✅ Aviso enviado em <#${channelId}>.`);
    } catch (err) {
      logError("aviso:modal", err, { userId: interaction.user?.id });
      await interaction.editReply("❌ Erro ao enviar aviso.").catch(() => {});
    }
  }
};
