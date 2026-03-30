-- Create app role and databases used by this project.
-- This file is executed by the official Postgres image on first init only.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dexa_app') THEN
    CREATE ROLE dexa_app LOGIN PASSWORD 'D3x@2026_App';
  END IF;
END
$$;

SELECT 'CREATE DATABASE dexa_attendance
  WITH ENCODING ''UTF8''
  LC_COLLATE=''en_US.utf8''
  LC_CTYPE=''en_US.utf8''
  TEMPLATE=template0'
WHERE NOT EXISTS (
  SELECT 1 FROM pg_database WHERE datname = 'dexa_attendance'
)\gexec

SELECT 'CREATE DATABASE dexa_attendance_log
  WITH ENCODING ''UTF8''
  LC_COLLATE=''en_US.utf8''
  LC_CTYPE=''en_US.utf8''
  TEMPLATE=template0'
WHERE NOT EXISTS (
  SELECT 1 FROM pg_database WHERE datname = 'dexa_attendance_log'
)\gexec

-- Ensure ownership + privileges
ALTER DATABASE dexa_attendance OWNER TO dexa_app;
ALTER DATABASE dexa_attendance_log OWNER TO dexa_app;

GRANT ALL PRIVILEGES ON DATABASE dexa_attendance TO dexa_app;
GRANT ALL PRIVILEGES ON DATABASE dexa_attendance_log TO dexa_app;

