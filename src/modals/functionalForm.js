const { isNumericId } = require("../utils/validators");
const { getModalText, getModalSelectValues } = require("../utils/modalFields");
const { submitFunctionalRequest } = require("../services/functionalService");
const { safeDefer } = require("../utils/interaction");

module.exports = {
  id: "functional:modal",
  async execute(client, interaction) {
    await safeDefer(interaction, true);

    try {
      const fullName = getModalText(interaction, "full_name").trim();
      const cityId = getModalText(interaction, "city_id").trim();
      const authCode = getModalText(interaction, "auth_code").trim().toUpperCase();
      const unit = getModalSelectValues(interaction, "unit")[0];
      const rank = getModalSelectValues(interaction, "rank")[0];

      if (!fullName) {
        return interaction.editReply("❌ Informe seu **nome e sobrenome**.");
      }

      if (!authCode) {
        return interaction.editReply("❌ Informe o **código de autorização**.");
      }

      if (!unit || !rank) {
        return interaction.editReply({
          content: "❌ Selecione **unidade** e **cargo** no formulário."
        });
      }

      if (!isNumericId(cityId)) {
        return interaction.editReply("❌ O **ID na Cidade** deve conter apenas números.");
      }

      const isDirect = interaction.customId === "functional:modal:direct";

      const result = await submitFunctionalRequest(
        interaction.guild,
        client.config,
        interaction.user,
        { fullName, cityId, unit, rank, authCode },
        { skipContestCheck: isDirect }
      );

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
        if (result.reason === "db_error") {
          return interaction.editReply(
            "❌ Erro ao salvar no banco de dados. Verifique a conexão com o Supabase."
          );
        }
        return interaction.editReply("❌ Não foi possível enviar a solicitação.");
      }

      await interaction.editReply(
        "✅ Solicitação enviada com sucesso! Aguarde a análise da equipe — você será avisado por DM."
      );
    } catch (err) {
      console.error("[functional:modal]", err);
      await interaction.editReply("❌ Erro ao processar o formulário. Tente novamente.").catch(() => {});
    }
  }
};
