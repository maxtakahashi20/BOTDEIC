const { getSupabase } = require("../database/client");

async function ensureUser(discordId) {
  const db = getSupabase();
  const { data: existing } = await db
    .from("users")
    .select("*")
    .eq("discord_id", discordId)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await db
    .from("users")
    .insert({ discord_id: discordId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function isContestApproved(discordId) {
  const db = getSupabase();
  const { data } = await db
    .from("users")
    .select("approved_contest")
    .eq("discord_id", discordId)
    .maybeSingle();

  return data?.approved_contest === true;
}

async function setContestApproved(discordId, approved = true) {
  const db = getSupabase();
  await ensureUser(discordId);
  const { error } = await db
    .from("users")
    .update({ approved_contest: approved, updated_at: new Date().toISOString() })
    .eq("discord_id", discordId);

  if (error) throw error;
}

module.exports = { ensureUser, isContestApproved, setContestApproved };
