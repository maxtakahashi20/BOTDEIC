-- Permite o bot operar via chave publishable/anon (ou sem service_role).
-- Recomendado em produção: usar SUPABASE_SERVICE_ROLE_KEY (sb_secret_...) no .env
-- e remover estas políticas abertas se as tabelas forem expostas ao cliente.

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'users', 'applications', 'functional_requests', 'authorization_codes',
    'tickets', 'ticket_logs', 'approvals', 'warnings', 'activity_logs'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS bot_full_access ON %I', t);
    EXECUTE format(
      'CREATE POLICY bot_full_access ON %I FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END $$;
