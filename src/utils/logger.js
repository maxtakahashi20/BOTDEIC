const KNOWN_DISCORD_HINTS = {
  50013: "sem permissão ou hierarquia insuficiente",
  50001: "recurso inacessível ao bot",
  50007: "DM bloqueada ou fechada",
  10008: "mensagem não encontrada",
  10003: "canal não encontrado",
  10007: "membro não encontrado",
  40060: "interação já reconhecida",
  10062: "interação desconhecida ou expirada",
  50035: "payload inválido"
};

const EXPECTED_DISCORD_CODES = new Set([50013, 50007, 10008, 10003, 10007]);

function isDiscordApiError(err) {
  return err != null && typeof err.code === "number" && (err.status != null || err.method != null);
}

function shortApiPath(url) {
  if (!url) return null;
  try {
    return new URL(url).pathname.replace(/^\/api\/v10\//, "");
  } catch {
    return url;
  }
}

function formatContext(context) {
  if (!context || typeof context !== "object") return "";
  const parts = Object.entries(context)
    .filter(([, value]) => value != null && value !== "")
    .map(([key, value]) => `${key}=${value}`);
  return parts.length ? ` | ${parts.join(" ")}` : "";
}

function formatError(err) {
  if (err == null) return "erro desconhecido";

  if (isDiscordApiError(err)) {
    const parts = [err.message || "Discord API error"];
    parts.push(`code=${err.code}`);
    if (err.status) parts.push(`status=${err.status}`);
    const apiPath = shortApiPath(err.url);
    if (err.method && apiPath) parts.push(`${err.method} ${apiPath}`);
    const hint = KNOWN_DISCORD_HINTS[err.code];
    if (hint) parts.push(hint);
    return parts.join(" | ");
  }

  if (typeof err === "object" && err.message && (err.code || err.details != null)) {
    const parts = [err.message];
    if (err.code) parts.push(`code=${err.code}`);
    if (err.details) parts.push(String(err.details));
    if (err.hint) parts.push(String(err.hint));
    return parts.join(" | ");
  }

  if (err instanceof Error) return err.message;
  return String(err);
}

function logError(scope, err, context) {
  console.error(`[${scope}] ${formatError(err)}${formatContext(context)}`);
}

function logWarn(scope, message, context) {
  const text = typeof message === "string" ? message : formatError(message);
  console.warn(`[${scope}] ${text}${formatContext(context)}`);
}

function logExpected(scope, err, context) {
  if (isDiscordApiError(err) && EXPECTED_DISCORD_CODES.has(err.code)) {
    logWarn(scope, formatError(err), context);
    return;
  }
  logError(scope, err, context);
}

module.exports = { formatError, logError, logWarn, logExpected };
