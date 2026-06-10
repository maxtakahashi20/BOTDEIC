const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} = require("discord.js");
const { LabelBuilder } = require("@discordjs/builders");
const { splitQuestionForModal } = require("./modalQuestion");

function labeledInput(shortLabel, question, customId, options = {}) {
  const { label, description, placeholder } = splitQuestionForModal(question, shortLabel, 0);

  const input = new TextInputBuilder()
    .setCustomId(customId)
    .setPlaceholder(placeholder)
    .setStyle(options.style ?? TextInputStyle.Short)
    .setRequired(options.required !== false);

  if (options.maxLength) input.setMaxLength(options.maxLength);

  const labelComponent = new LabelBuilder().setLabel(label).setTextInputComponent(input);
  if (description) labelComponent.setDescription(description);
  return labelComponent;
}

function labeledSelect(shortLabel, question, selectMenu) {
  const { label, description } = splitQuestionForModal(question, shortLabel, 0);
  const labelComponent = new LabelBuilder().setLabel(label).setStringSelectMenuComponent(selectMenu);
  if (description) labelComponent.setDescription(description);
  return labelComponent;
}

function buildFunctionalModal(config, mode = "form") {
  const units = config.units ?? [];
  const ranks = config.ranks ?? [];
  const form = config.functionalForm ?? {};

  const modal = new ModalBuilder()
    .setCustomId(`functional:modal:${mode}`)
    .setTitle(form.title ?? "Solicitar Funcional PC");

  const nomeLabel = labeledInput(
    "Nome e Sobrenome (Na cidade)",
    "Informe seu nome e sobrenome conforme registrado na cidade.",
    "full_name",
    { style: TextInputStyle.Short, maxLength: 80 }
  );

  const idLabel = labeledInput(
    "Informe seu ID",
    "Digite apenas os números do seu ID na cidade.",
    "city_id",
    { style: TextInputStyle.Short, maxLength: 10 }
  );

  const unitLabel = labeledSelect(
    "Informe a unidade",
    "Selecione a unidade à qual você pertence.",
    new StringSelectMenuBuilder()
      .setCustomId("unit")
      .setPlaceholder("Selecione sua unidade:")
      .setRequired(true)
      .addOptions(
        units.slice(0, 25).map((unit) =>
          new StringSelectMenuOptionBuilder().setLabel(unit).setValue(unit)
        )
      )
  );

  const rankLabel = labeledSelect(
    "Informe seu cargo",
    "Selecione seu cargo ou patente atual.",
    new StringSelectMenuBuilder()
      .setCustomId("rank")
      .setPlaceholder("Selecione seu cargo:")
      .setRequired(true)
      .addOptions(
        ranks.slice(0, 25).map((rank) =>
          new StringSelectMenuOptionBuilder().setLabel(rank).setValue(rank)
        )
      )
  );

  const codeLabel = labeledInput(
    "Código de autorização",
    "Informe o código de autorização fornecido pelo responsável da unidade.",
    "auth_code",
    { style: TextInputStyle.Short, maxLength: 20 }
  );

  modal.addLabelComponents(nomeLabel, idLabel, unitLabel, rankLabel, codeLabel);

  return modal;
}

module.exports = { buildFunctionalModal };
