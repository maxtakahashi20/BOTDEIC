const NICKNAME_MAX = 32;

function buildNicknameFromTemplate(template, data) {
  const nome = String(data.full_name ?? data.nome ?? "").trim();
  const id = String(data.city_id ?? data.id ?? "").trim();
  const unit = String(data.unit ?? data.unidade ?? "").trim();
  const rank = String(data.rank ?? data.cargo ?? "").trim();

  return template
    .replaceAll("{nome}", nome)
    .replaceAll("{id}", id)
    .replaceAll("{unidade}", unit)
    .replaceAll("{unit}", unit)
    .replaceAll("{cargo}", rank)
    .replaceAll("{rank}", rank)
    .trim()
    .slice(0, NICKNAME_MAX);
}

module.exports = { buildNicknameFromTemplate, NICKNAME_MAX };
