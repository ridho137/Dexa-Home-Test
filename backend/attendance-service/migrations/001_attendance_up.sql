-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "citext";

-- Attendance schema
CREATE SCHEMA IF NOT EXISTS attendance AUTHORIZATION dexa_app;

-- Core attendances table
CREATE TABLE IF NOT EXISTS attendance.attendances (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  attendance_date DATE NOT NULL,
  attendance_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('IN', 'OUT')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE attendance.attendances OWNER TO dexa_app;

CREATE INDEX IF NOT EXISTS idx_attendance_employee_date
  ON attendance.attendances (employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date_time_desc
  ON attendance.attendances (employee_id, attendance_date DESC, attendance_time DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_date_time_desc
  ON attendance.attendances (attendance_date DESC, attendance_time DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_date_employee_time_desc
  ON attendance.attendances (attendance_date, employee_id, attendance_time DESC);

