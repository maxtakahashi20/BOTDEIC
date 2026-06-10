function findModalField(interaction, customId) {
  if (typeof interaction.fields?.getField === "function") {
    const field = interaction.fields.getField(customId);
    if (field) return field;
  }

  const groups = interaction.fields?.components ?? interaction.fields?.fields;
  if (!groups) return null;

  for (const group of groups.values?.() ?? groups) {
    const components = group.components ?? [group];
    for (const component of components) {
      if (component.customId === customId) return component;
    }
  }

  return null;
}

function getModalText(interaction, customId) {
  const field = findModalField(interaction, customId);
  if (field?.value != null) return String(field.value);

  try {
    return interaction.fields.getTextInputValue(customId);
  } catch {
    return "";
  }
}

function getModalSelectValues(interaction, customId) {
  const field = findModalField(interaction, customId);
  if (field?.values?.length) return field.values;
  if (field?.value) return [field.value];

  try {
    const values = interaction.fields.getStringSelectValues(customId);
    if (values?.length) return values;
  } catch {
    // fallback abaixo
  }

  return [];
}

module.exports = { getModalText, getModalSelectValues, findModalField };
