-- Enable useful extensions (database-wide, safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Employee schema (owned by application user)
CREATE SCHEMA IF NOT EXISTS employee AUTHORIZATION dexa_app;

-- Core employees table for employee management
CREATE TABLE IF NOT EXISTS employee.employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email CITEXT NOT NULL UNIQUE,
  position TEXT NOT NULL,
  -- Mirror of auth.users.role for reporting/filtering
  role TEXT NOT NULL DEFAULT 'EMPLOYEE',
  phone_number TEXT,
  photo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Set ownership to application user
ALTER TABLE employee.employees OWNER TO dexa_app;

-- Seed initial administrator employee for early testing
INSERT INTO employee.employees (id, name, email, position, role, phone_number, photo_url, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Admin HR',
  'admin@dexa.local',
  'HRD',
  'ADMIN_HR',
  '+12345678910',
  'https://nos.wjv-1.neo.id/dexa/profile/00000000-0000-0000-0000-000000000001',
  TRUE
)
ON CONFLICT (email) DO NOTHING;

-- Useful indexes for list/pagination & filtering
CREATE INDEX IF NOT EXISTS idx_employee_employees_role ON employee.employees (role);
CREATE INDEX IF NOT EXISTS idx_employee_employees_name ON employee.employees (name);
CREATE INDEX IF NOT EXISTS idx_employee_employees_email ON employee.employees (email);
CREATE INDEX IF NOT EXISTS idx_employee_employees_role_name
  ON employee.employees (role, name ASC);
CREATE INDEX IF NOT EXISTS idx_employee_employees_name_trgm
  ON employee.employees USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_employee_employees_email_trgm
  ON employee.employees USING gin ((email::text) gin_trgm_ops);