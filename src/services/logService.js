const { EmbedBuilder } = require("discord.js");
const { getSupabase } = require("../database/client");

async function logActivity({ category, action, actorId, targetId, details = {} }) {
  const db = getSupabase();
  await db.from("activity_logs").insert({
    category,
    action,
    actor_id: actorId ?? null,
    target_id: targetId ?? null,
    details
  });
}

async function logToChannel(client, config, { title, description, color = 0x5865f2, fields = [] }) {
  const channelId = config.channels?.generalLogs;
  if (!channelId) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp();

  if (fields.length) embed.addFields(fields);

  await channel.send({ embeds: [embed] }).catch(() => {});
}

async function logAndNotify(client, config, activity, embedData) {
  await logActivity(activity);
  await logToChannel(client, config, embedData);
}

module.exports = { logActivity, logToChannel, logAndNotify };
