const fs = require("node:fs");
const path = require("node:path");

function loadFromDir(dir, validate) {
  if (!fs.existsSync(dir)) return new Map();

  const map = new Map();
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".js"));

  for (const file of files) {
    const mod = require(path.join(dir, file));
    const entry = validate(mod, file);
    if (entry) map.set(entry.id, entry.handler);
  }

  return map;
}

function loadNestedHandlers(baseDir, validate) {
  const map = new Map();
  if (!fs.existsSync(baseDir)) return map;

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(".js")) {
        const mod = require(full);
        const result = validate(mod, full);
        if (result) map.set(result.id, result.handler);
      }
    }
  }

  walk(baseDir);
  return map;
}

module.exports = { loadFromDir, loadNestedHandlers };
