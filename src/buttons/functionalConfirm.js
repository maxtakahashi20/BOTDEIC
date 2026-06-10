const { submitFunctionalRequest } = require("../services/functionalService");

module.exports = {
  id: "functional:confirm",
  async execute(client, interaction) {
    const pending = client.pendingFunctional?.get(interaction.user.id);

    if (!pending?.fullName || !pending?.cityId || !pending?.authCode) {
      return interaction.reply({
        content: "❌ Sessão expirada. Inicie novamente.",
        ephemeral: true
      });
    }

    if (!pending.unit || !pending.rank) {
      return interaction.reply({
        content: "❌ Selecione **Unidade** e **Cargo** antes de confirmar.",
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const result = await submitFunctionalRequest(interaction.guild, client.config, interaction.user, {
      fullName: pending.fullName,
      cityId: pending.cityId,
      unit: pending.unit,
      rank: pending.rank,
      authCode: pending.authCode
    });

    client.pendingFunctional.delete(interaction.user.id);

    if (!result.ok) {
      if (result.reason === "invalid_code") {
        return interaction.editReply(
          client.config.messages?.codeInvalid ?? "❌ Código inválido ou já utilizado."
        );
      }
      if (result.reason === "not_approved") {
        return interaction.editReply(
          client.config.messages?.notApprovedForFunctional ?? "🚫 Não aprovado no concurso."
        );
      }
      return interaction.editReply("❌ Não foi possível enviar a solicitação.");
    }

    await interaction.editReply(
      "✅ Solicitação enviada com sucesso! Aguarde a análise da equipe — você será avisado por DM."
    );
  }
};
