module.exports = {
  id: "functional:unitrank",
  async execute(client, interaction) {
    const pending = client.pendingFunctional?.get(interaction.user.id);
    if (!pending) {
      return interaction.reply({
        content: "❌ Sessão expirada. Clique em **Solicitar Funcional** novamente.",
        ephemeral: true
      });
    }

    const [type, value] = interaction.values[0].split(":");
    if (type === "unit") pending.unit = value;
    if (type === "rank") pending.rank = value;

    client.pendingFunctional.set(interaction.user.id, pending);

    const { unit, rank } = pending;
    const ready = unit && rank;

    return interaction.reply({
      content: ready
        ? `✅ Selecionado: **${unit}** / **${rank}**. Clique em **Confirmar** para enviar.`
        : `📌 ${unit ? `Unidade: **${unit}**` : "Selecione a unidade"}${rank ? ` | Cargo: **${rank}**` : ""}`,
      ephemeral: true
    });
  }
};
