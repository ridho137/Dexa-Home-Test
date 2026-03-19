-- Down migration for auth-service

-- Drop session table and indexes
DROP INDEX IF EXISTS idx_auth_sessions_active_created_at;
DROP INDEX IF EXISTS idx_auth_sessions_active_last_activity;
DROP INDEX IF EXISTS idx_auth_sessions_last_activity;
DROP INDEX IF EXISTS idx_auth_sessions_user_id;
DROP TABLE IF EXISTS auth.sessions;

-- Drop users table and index
DROP INDEX IF EXISTS idx_auth_users_email;
DROP TABLE IF EXISTS auth.users;

-- Drop role enum type if no longer used
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'user_role' AND n.nspname = 'auth'
  ) THEN
    DROP TYPE auth.user_role;
  END IF;
END$$;

-- Optionally drop schema (only if empty)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'auth'
  ) THEN
    DROP SCHEMA IF EXISTS auth;
  END IF;
END$$;

