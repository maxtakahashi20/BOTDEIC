const { createClient } = require("@supabase/supabase-js");

let supabase = null;

function getSupabase() {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no .env");
  }

  if (key.startsWith("sb_publishable_")) {
    // eslint-disable-next-line no-console
    console.warn(
      "⚠️ SUPABASE_SERVICE_ROLE_KEY parece ser chave publishable (anon). " +
        "Use a secret key (sb_secret_...) em Settings → API, ou execute migrations/002_bot_rls_policies.sql"
    );
  }

  supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  return supabase;
}

module.exports = { getSupabase };
