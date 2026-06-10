const { StringSelectMenuOptionBuilder } = require("discord.js");

const DEFAULT_CATEGORIES = [
  {
    id: "duvidas",
    label: "Dúvidas",
    description: "Tire dúvidas gerais sobre a instituição, normas e procedimentos.",
    emoji: "❓"
  },
  {
    id: "denuncias",
    label: "Denúncias",
    description: "Reporte condutas irregulares ou situações que exigem apuração.",
    emoji: "🚨"
  },
  {
    id: "recursos_humanos",
    label: "Recursos Humanos",
    description: "Assuntos de RH, documentação, escalas e gestão de pessoal.",
    emoji: "👥"
  },
  {
    id: "outros",
    label: "Outros",
    description: "Demais assuntos que não se enquadram nas categorias acima.",
    emoji: "📌"
  }
];

function getTicketCategories(config) {
  return config.ticketCategories?.length ? config.ticketCategories : DEFAULT_CATEGORIES;
}

function getCategoryLabel(config, categoryId) {
  const cat = getTicketCategories(config).find((c) => c.id === categoryId);
  return cat?.label ?? categoryId;
}

function buildCategorySelectOptions(config) {
  return getTicketCategories(config).map((cat) => {
    const option = new StringSelectMenuOptionBuilder()
      .setLabel(cat.label)
      .setValue(cat.id)
      .setDescription((cat.description ?? "").slice(0, 100));

    if (cat.emoji) option.setEmoji(cat.emoji);
    return option;
  });
}

module.exports = {
  getTicketCategories,
  getCategoryLabel,
  buildCategorySelectOptions
};
