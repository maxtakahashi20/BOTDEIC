const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");
const { LabelBuilder } = require("@discordjs/builders");
const { getPendingApplication } = require("../services/contestService");
const { chunkArray } = require("../utils/validators");
const { splitQuestionForModal } = require("../utils/modalQuestion");

function buildContestModal(config, step) {
  const questions = config.contest.questions;
  const chunks = chunkArray(questions, 5);
  const chunk = chunks[step] ?? [];

  const baseTitle = config.contest?.formTitle ?? "Formulário de Inscrição";
  const stepSuffix = chunks.length > 1 ? ` (${step + 1}/${chunks.length})` : "";
  const title =
    baseTitle.length + stepSuffix.length > 45
      ? `${baseTitle.slice(0, 45 - stepSuffix.length)}${stepSuffix}`
      : `${baseTitle}${stepSuffix}`;

  const modal = new ModalBuilder()
    .setCustomId(`contest:modal:${step}`)
    .setTitle(title);

  const labels = chunk.map((q, index) => {
    const { label, description, placeholder } = splitQuestionForModal(
      q.question ?? q.label,
      q.label,
      step * 5 + index + 1
    );

    const input = new TextInputBuilder()
      .setCustomId(q.id)
      .setPlaceholder(placeholder)
      .setRequired(q.required !== false)
      .setStyle(q.style === "paragraph" ? TextInputStyle.Paragraph : TextInputStyle.Short);

    if (q.maxLength) input.setMaxLength(Math.min(q.maxLength, 4000));

    const labelComponent = new LabelBuilder().setLabel(label).setTextInputComponent(input);
    if (description) labelComponent.setDescription(description);

    return labelComponent;
  });

  modal.addLabelComponents(...labels);

  return modal;
}

module.exports = {
  id: "contest:register",
  async execute(client, interaction) {
    const config = client.config;

    const pending = await getPendingApplication(interaction.user.id);
    if (pending) {
      return interaction.reply({
        content: "⚠️ Você já possui uma inscrição pendente de análise.",
        ephemeral: true
      });
    }

    if (!client.pendingContest) client.pendingContest = new Map();
    client.pendingContest.set(interaction.user.id, { answers: {}, step: 0 });

    try {
      return await interaction.showModal(buildContestModal(config, 0));
    } catch (err) {
      console.error("[contest:register]", err);
      return interaction.reply({
        content: "❌ Não foi possível abrir o formulário. Tente novamente.",
        ephemeral: true
      });
    }
  }
};

module.exports.buildContestModal = buildContestModal;
