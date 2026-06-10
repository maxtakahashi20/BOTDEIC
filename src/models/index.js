/**
 * Referência das tabelas Supabase utilizadas pelo bot.
 * Acesso aos dados é feito via services/ e database/client.js.
 */
const TABLES = {
  USERS: "users",
  APPLICATIONS: "applications",
  FUNCTIONAL_REQUESTS: "functional_requests",
  AUTHORIZATION_CODES: "authorization_codes",
  TICKETS: "tickets",
  TICKET_LOGS: "ticket_logs",
  APPROVALS: "approvals",
  WARNINGS: "warnings",
  ACTIVITY_LOGS: "activity_logs"
};

module.exports = { TABLES };
