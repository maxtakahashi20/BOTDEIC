async function safeReply(interaction, options) {
  if (interaction.deferred || interaction.replied) {
    return interaction.followUp(options).catch(() => {});
  }
  return interaction.reply(options).catch(() => {});
}

async function safeDefer(interaction, ephemeral = true) {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral }).catch(() => {});
  }
}

module.exports = { safeReply, safeDefer };
