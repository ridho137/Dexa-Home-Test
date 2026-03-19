-- Enable useful extensions (database-wide, safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS "citext";

-- Auth schema (owned by application user)
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION dexa_app;

-- Role enum for users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'user_role' AND n.nspname = 'auth'
  ) THEN
    CREATE TYPE auth.user_role AS ENUM ('EMPLOYEE', 'ADMIN_HR');
  END IF;
END$$;

-- Core users table for authentication
CREATE TABLE IF NOT EXISTS auth.users (
  id TEXT PRIMARY KEY,
  email CITEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role auth.user_role NOT NULL DEFAULT 'EMPLOYEE',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE auth.users OWNER TO dexa_app;

-- Seed initial administrator user (password is bcrypt hash of 'Admin#1234')
INSERT INTO auth.users (id, email, password_hash, role, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@dexa.local',
  '$2b$10$Zv8H7QsQxHLtAJyk/rNm7uy5V9QBRJLj5QT/twygRxCml4kM87.2G',
  'ADMIN_HR',
  TRUE
)
ON CONFLICT (email) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth.users (email);

-- Session table to track user activity and refresh usage
CREATE TABLE IF NOT EXISTS auth.sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  refresh_token TEXT,
  last_activity_at TIMESTAMPTZ,
  last_refresh_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE auth.sessions OWNER TO dexa_app;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_auth_sessions_user_id_users'
  ) THEN
    ALTER TABLE auth.sessions
      ADD CONSTRAINT fk_auth_sessions_user_id_users
      FOREIGN KEY (user_id) REFERENCES auth.users(id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth.sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_last_activity ON auth.sessions (last_activity_at);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_active_last_activity
  ON auth.sessions (last_activity_at)
  WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_auth_sessions_active_created_at
  ON auth.sessions (created_at)
  WHERE is_active = TRUE;

