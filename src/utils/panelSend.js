function normalizeChannelIds(value) {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value]).filter(Boolean);
}

function messageHasPanelComponent(message, customIds) {
  const ids = new Set(customIds);
  return message.components.some((row) =>
    row.components.some((component) => ids.has(component.customId))
  );
}

async function clearPreviousPanelMessages(channel, customIds) {
  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  if (!messages) return;

  const botId = channel.client.user.id;
  const toDelete = messages.filter(
    (msg) => msg.author.id === botId && messageHasPanelComponent(msg, customIds)
  );

  for (const msg of toDelete.values()) {
    await msg.delete().catch(() => {});
  }
}

async function sendPanelToChannels(guild, channelIds, payload, panelCustomIds) {
  const ids = normalizeChannelIds(channelIds);
  if (!ids.length) return { sent: [], failed: ids };

  const sent = [];
  const failed = [];

  for (const channelId of ids) {
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased()) {
      failed.push(channelId);
      continue;
    }

    if (panelCustomIds?.length) {
      await clearPreviousPanelMessages(channel, panelCustomIds);
    }

    await channel.send(payload);
    sent.push(channelId);
  }

  return { sent, failed };
}

module.exports = {
  normalizeChannelIds,
  clearPreviousPanelMessages,
  sendPanelToChannels
};
