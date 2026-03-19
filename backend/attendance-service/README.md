# Attendance Service

NestJS microservice for **WFH attendance**: clock-in/clock-out records and summaries. It enforces business rules (e.g. first record of the day must be IN, then OUT) and verifies employee existence and active status via the Employee service gRPC before persisting or returning data.

## Features

- **Record attendance** — POST one record per request: date (optional, default today), time (server), status `IN` or `OUT`. Rules: first of the day must be IN; cannot OUT without a prior IN; no duplicate OUT; no two consecutive same status.
- **My summary** — List current user’s attendance grouped by date, with total work hours per day. Optional date range filter; default range is start of current month through today.
- **Today’s status** — Get today’s attendance state (has checked in/out, first IN time, last OUT time, last status).
- **Admin list** — List all attendance records grouped by date and employee, with employee name (via gRPC), pagination, and filters by date range and employee ID. Sorted by date DESC. Default date range: start of month to today.
- **Auto clock-out scheduler** — Runs daily at `00:00` and creates `OUT` attendance for previous-day (`H-1`) records that are still open (`IN` without closing `OUT`).

All operations that use `employeeId` (from Gateway credentials) call the Employee service gRPC to ensure the employee exists and is active; otherwise they return 404 or 401 as appropriate.

## Architecture

Clean architecture:

- **Domain** — `Attendance` entity, `AttendanceRepository` interface, filter/result types.
- **Application** — Use cases: `CreateAttendanceUseCase`, `ListMyAttendanceUseCase`, `GetTodayAttendanceStatusUseCase`, `ListAdminAttendanceUseCase`. Each uses `EmployeeGrpcClient` when employee context is needed.
- **Infrastructure** — PostgreSQL repository, Employee gRPC client.
- **Presentation** — HTTP controller, DTOs, credentials middleware, admin role guard for `/attendances/admin`.

## API (HTTP)

Use base path **`/attendance`** when calling via the API Gateway. All routes require a valid Bearer access token and Gateway credentials.

### Employee

| Method | Path | Description |
|--------|------|-------------|
| POST | `/attendance/attendances` | Record one attendance. Body: `{ "status": "IN" \| "OUT", "attendanceDate"?: "YYYY-MM-DD" }`. Date defaults to today. |
| GET | `/attendance/attendances/me` | My attendance summary. Query: `page`, `limit`, `startDate`, `endDate` (YYYY-MM-DD). Default range: first day of current month to today. |
| GET | `/attendance/attendances/me/today` | Today’s attendance status (hasCheckedIn, hasCheckedOut, firstInTime, lastOutTime, lastStatus). |

### Admin (ADMIN_HR only)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/attendance/attendances/admin` | List all attendance. Query: `page`, `limit`, `startDate`, `endDate`, `employeeId`. Default date range: start of month to today. Response grouped by date and employee with total work hours. |

Date query params must be `YYYY-MM-DD`; invalid format returns 400.

## gRPC (client only)

This service does not expose gRPC. It **calls** the Employee service gRPC (`GetEmployee`) to validate employee id and active status before create/list operations.

## Scheduler

- **`AttendanceAutoClockoutScheduler.autoClockOutPreviousDayOpenSessions()`**
  - Cron: `0 0 * * *` (daily at midnight, server time)
  - Target date: previous day (`H-1`)
  - Logic:
    - find employees whose last attendance status on target date is `IN`
    - insert auto-generated `OUT` row at `23:59:59` on that same date
  - Purpose: prevent open attendance sessions when user forgets to clock out.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP port | `3020` |
| `DB_*` | PostgreSQL (`dexa_attendance`) | — |
| `EMPLOYEE_GRPC_URL` | Employee service gRPC address | `localhost:50020` |
| `LOG_LEVEL` | `DEBUG`, `WARN`, `ERROR` | `DEBUG` |

## Database

- **Database:** `dexa_attendance`.
- **Schema:** `attendance`.
- **Tables:** `attendances` (id, employee_id, attendance_date, attendance_time, status IN/OUT, created_at).

Migrations: `migrations/001_attendance_up.sql`, `001_attendance_down.sql`.

## How to Run

```bash
cd backend/attendance-service
npm install
# Configure .env (DB, EMPLOYEE_GRPC_URL)
npm run start:dev
```

Or from `backend`: `npm run start:attendance`.

Requires: PostgreSQL, Employee service (gRPC) reachable.

## Docker

Build image:

```bash
docker build -t dexa-attendance-service:latest ./backend/attendance-service
```

Run container:

```bash
docker run --rm -p 3020:3020 --env-file ./backend/attendance-service/.env dexa-attendance-service:latest
```

Notes:

- The scheduler for auto clock-out runs inside this service process (daily at `00:00` server time).
- Ensure container timezone and deployment timezone policy are aligned with your attendance rules.
