-- BOT DEIC — Schema inicial
-- Execute no SQL Editor do Supabase ou via: supabase db push

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Usuários ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id TEXT NOT NULL UNIQUE,
  approved_contest BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Inscrições (Concurso) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'archived')),
  channel_id TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_discord_id ON applications (discord_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications (status);

-- ─── Solicitações de Funcional ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS functional_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  city_id TEXT NOT NULL,
  unit TEXT NOT NULL,
  rank TEXT NOT NULL,
  auth_code_id UUID,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  message_id TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_functional_requests_discord_id ON functional_requests (discord_id);
CREATE INDEX IF NOT EXISTS idx_functional_requests_status ON functional_requests (status);

-- ─── Códigos de Autorização ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS authorization_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used BOOLEAN NOT NULL DEFAULT FALSE,
  used_by TEXT,
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_authorization_codes_code ON authorization_codes (code);
CREATE INDEX IF NOT EXISTS idx_authorization_codes_used ON authorization_codes (used);

-- ─── Tickets ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT NOT NULL UNIQUE,
  opener_id TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed')),
  claimed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tickets_opener_id ON tickets (opener_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets (status);

-- ─── Logs de Tickets ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets (id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_id TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_logs_ticket_id ON ticket_logs (ticket_id);

-- ─── Aprovações / Reprovações ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  reference_id UUID,
  discord_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected')),
  responsible_id TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approvals_discord_id ON approvals (discord_id);
CREATE INDEX IF NOT EXISTS idx_approvals_type ON approvals (type);

-- ─── Avisos ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  channel_id TEXT NOT NULL,
  mention_type TEXT NOT NULL DEFAULT 'none',
  sent_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Logs gerais de atividade ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id TEXT,
  target_id TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_category ON activity_logs (category);

-- FK funcional → código (após authorization_codes existir)
ALTER TABLE functional_requests
  DROP CONSTRAINT IF EXISTS functional_requests_auth_code_id_fkey;

ALTER TABLE functional_requests
  ADD CONSTRAINT functional_requests_auth_code_id_fkey
  FOREIGN KEY (auth_code_id) REFERENCES authorization_codes (id);

-- RLS: bot usa service_role (bypass). Habilitar RLS como defesa em profundidade.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE functional_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE authorization_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
