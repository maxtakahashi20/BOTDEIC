const { getSupabase } = require("../database/client");

function generateCode(prefix = "PM") {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let segment = "";
  for (let i = 0; i < 6; i++) {
    segment += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${segment}`;
}

async function createCode(createdBy, prefix) {
  const db = getSupabase();
  let code;
  let attempts = 0;

  while (attempts < 10) {
    code = generateCode(prefix);
    const { data, error } = await db
      .from("authorization_codes")
      .insert({ code, created_by: createdBy })
      .select()
      .single();

    if (!error) return data;
    if (error.code !== "23505") throw error;
    attempts++;
  }

  throw new Error("Não foi possível gerar código único");
}

async function validateAndUseCode(code, usedBy) {
  try {
    const db = getSupabase();
    const normalized = code.trim().toUpperCase();

    const { data: row, error } = await db
      .from("authorization_codes")
      .select("*")
      .eq("code", normalized)
      .maybeSingle();

    if (error) {
      console.error("[validateAndUseCode] select", error);
      return { valid: false, row: null };
    }
    if (!row || row.used) return { valid: false, row: null };

    const { error: updateError } = await db
      .from("authorization_codes")
      .update({
        used: true,
        used_by: usedBy,
        used_at: new Date().toISOString()
      })
      .eq("id", row.id)
      .eq("used", false);

    if (updateError) {
      console.error("[validateAndUseCode] update", updateError);
      return { valid: false, row: null };
    }

    return { valid: true, row };
  } catch (err) {
    console.error("[validateAndUseCode]", err);
    return { valid: false, row: null };
  }
}

module.exports = { generateCode, createCode, validateAndUseCode };
