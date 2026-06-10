const { openFunctionalModal } = require("../utils/openFunctionalModal");

module.exports = {
  id: "functional:request",
  async execute(client, interaction) {
    return openFunctionalModal(interaction, client.config, "form");
  }
};
