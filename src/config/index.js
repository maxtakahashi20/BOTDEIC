const fs = require("node:fs");
const path = require("node:path");

function requireString(value, field) {
  if (!value || typeof value !== "string") {
    throw new Error(`config.${field} ausente ou inválido em config/config.json`);
  }
}

function requireArray(value, field) {
  if (!Array.isArray(value)) {
    throw new Error(`config.${field} deve ser um array em config/config.json`);
  }
}

function loadConfig() {
  const configPath = path.join(__dirname, "..", "..", "config", "config.json");
  const raw = fs.readFileSync(configPath, "utf8");
  const cfg = JSON.parse(raw);

  requireString(cfg.guildId, "guildId");
  requireArray(cfg.allowedRoleIds, "allowedRoleIds");
  requireArray(cfg.units, "units");
  requireArray(cfg.ranks, "ranks");

  if (!cfg.channels || typeof cfg.channels !== "object") {
    throw new Error("config.channels ausente em config/config.json");
  }
  if (!cfg.roles || typeof cfg.roles !== "object") {
    throw new Error("config.roles ausente em config/config.json");
  }
  if (!cfg.contest?.questions?.length) {
    throw new Error("config.contest.questions deve ter ao menos 1 pergunta");
  }

  return cfg;
}

module.exports = { loadConfig };
