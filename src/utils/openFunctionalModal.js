const { buildFunctionalModal } = require("./functionalModal");

async function openFunctionalModal(interaction, config, mode = "form") {
  try {
    return await interaction.showModal(buildFunctionalModal(config, mode));
  } catch (err) {
    console.error(`[functional:${mode}]`, err);
    return interaction.reply({
      content: "❌ Não foi possível abrir o formulário. Tente novamente.",
      ephemeral: true
    });
  }
}

module.exports = { openFunctionalModal };
