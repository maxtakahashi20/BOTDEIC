const { openFunctionalModal } = require("../utils/openFunctionalModal");

module.exports = {
  id: "functional:direct",
  async execute(client, interaction) {
    return openFunctionalModal(interaction, client.config, "direct");
  }
};
