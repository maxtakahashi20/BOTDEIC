const LABEL_MAX = 45;
const DESCRIPTION_MAX = 100;
const PLACEHOLDER_MAX = 100;

function splitQuestionForModal(question, fallbackLabel, index) {
  const text = (question ?? "").trim();
  const label = (fallbackLabel ?? `Pergunta ${index}`).slice(0, LABEL_MAX);

  let description = "";
  let placeholder = "Digite sua resposta aqui.";

  if (!text || text === label) {
    return { label, description, placeholder };
  }

  if (text.length <= DESCRIPTION_MAX) {
    description = text;
    return { label, description, placeholder };
  }

  description = text.slice(0, DESCRIPTION_MAX);
  const remainder = text.slice(DESCRIPTION_MAX, DESCRIPTION_MAX + PLACEHOLDER_MAX).trim();
  if (remainder) placeholder = remainder;

  return { label, description, placeholder };
}

module.exports = { splitQuestionForModal, LABEL_MAX, DESCRIPTION_MAX, PLACEHOLDER_MAX };
