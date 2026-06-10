const path = require("node:path");
const { loadNestedHandlers } = require("../utils/loader");
const { safeReply } = require("../utils/interaction");

const buttons = loadNestedHandlers(path.join(__dirname, "..", "buttons"), (mod) => {
  if (!mod.id || typeof mod.execute !== "function") return null;
  return { id: mod.id, handler: mod.execute };
});

const modals = loadNestedHandlers(path.join(__dirname, "..", "modals"), (mod) => {
  if (!mod.id || typeof mod.execute !== "function") return null;
  return { id: mod.id, handler: mod.execute };
});

const selectMenus = loadNestedHandlers(path.join(__dirname, "..", "selectmenus"), (mod) => {
  if (!mod.id || typeof mod.execute !== "function") return null;
  return { id: mod.id, handler: mod.execute };
});

function matchHandler(map, customId) {
  if (map.has(customId)) return map.get(customId);

  const prefixes = [...map.keys()].sort((a, b) => b.length - a.length);
  for (const prefix of prefixes) {
    if (customId === prefix || customId.startsWith(`${prefix}:`)) {
      return map.get(prefix);
    }
  }

  return null;
}

async function handleSlashCommand(client, interaction) {
  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) return;

  try {
    await cmd.execute(client, interaction);
  } catch (err) {
    if (err?.code === "FORBIDDEN") {
      return safeReply(interaction, {
        content: "🚫 Você não tem permissão para usar este comando.",
        ephemeral: true
      });
    }
    console.error("[SLASH]", err);
    return safeReply(interaction, {
      content: "❌ Ocorreu um erro ao executar o comando.",
      ephemeral: true
    });
  }
}

module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(client, interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        return handleSlashCommand(client, interaction);
      }

      if (interaction.isButton()) {
        const handler = matchHandler(buttons, interaction.customId);
        if (handler) return handler(client, interaction);
      }

      if (interaction.isStringSelectMenu()) {
        const handler = matchHandler(selectMenus, interaction.customId);
        if (handler) return handler(client, interaction);
      }

      if (interaction.isModalSubmit()) {
        const handler = matchHandler(modals, interaction.customId);
        if (handler) return handler(client, interaction);
      }
    } catch (err) {
      console.error("[interactionCreate]", err);
      const payload = {
        content: "❌ Ocorreu um erro ao processar sua interação.",
        ephemeral: true
      };
      if (interaction.isRepliable?.()) {
        await safeReply(interaction, payload);
      }
    }
  }
};
