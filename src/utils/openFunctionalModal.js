const { buildFunctionalModal } = require("./functionalModal");
const { logError } = require("./logger");

async function openFunctionalModal(interaction, config, mode = "form") {
  try {
    return await interaction.showModal(buildFunctionalModal(config, mode));
  } catch (err) {
    logError(`functional:${mode}`, err, { userId: interaction.user?.id });
    return interaction.reply({
      content: "❌ Não foi possível abrir o formulário. Tente novamente.",
      ephemeral: true
    });
  }
}

module.exports = { openFunctionalModal };
