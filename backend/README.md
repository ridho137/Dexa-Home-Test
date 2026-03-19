# Backend — WFH Attendance & HR Monitoring

Monorepo of **NestJS** microservices plus an **API Gateway**. Implements employee self-service (profile, attendance), admin HR (employees and attendance list), authentication (JWT + sessions), and real-time admin notifications via WebSocket and a message queue.

---

## Architecture Overview

```
                    +------------------+
                    |   Client (FE)   |
                    +--------+--------+
                             |
                    HTTP (REST + Bearer JWT)
                             |
                    +--------v--------+
                    |  API Gateway    |  Port 3000
                    |  - Auth check   |
                    |  - Proxy        |
                    +--------+--------+
                             |
         +-------------------+-------------------+
         |                   |                   |
   gRPC (token)        HTTP + headers       HTTP + headers
         |                   |                   |
  +------v------+   +--------v--------+   +-------v--------+
  | Auth        |   | Employee       |   | Attendance      |
  | Service     |   | Service        |   | Service         |
  | 3010 / 50010|   | 3050 / 50020   |   | 3020            |
  +------+------+   +--------+-------+   +--------+--------+
         |                   |                   |
         | gRPC              | gRPC              | gRPC
         | (CreateUser,      | (GetEmployee)     | (GetEmployee)
         |  ChangePassword)  |                   |
         +-------------------+-------------------+
                             |
                    +--------v--------+
                    | Notification    |  Port 3030
                    | Service         |  WebSocket /admin
                    | + RabbitMQ      |  Consumer -> DB log + broadcast
                    +-----------------+
```

- **Gateway** — Single public entry. Validates JWT via Auth gRPC; forwards requests to the right service with `x-user-credentials` and `x-gateway-signature`.
- **Auth** — Login, refresh, logout (HTTP); token checks and user/password operations (gRPC). Stores users and sessions in PostgreSQL.
- **Employee** — Profile CRUD, self-service and admin. Calls Auth gRPC for password and user creation; publishes events to RabbitMQ; exposes gRPC for employee lookup.
- **Attendance** — Clock-in/out and summaries. Calls Employee gRPC to ensure employee exists and is active; stores records in PostgreSQL, with daily auto clock-out for open previous-day sessions.
- **Notification** — Consumes RabbitMQ events, writes to a separate log DB, and broadcasts to admin clients over WebSocket (Socket.IO). No REST API.

---

## Technology Stack

| Area | Choice |
|------|--------|
| Language | TypeScript |
| Framework | NestJS |
| Database | PostgreSQL (single DB `dexa_attendance` with schemas per service; separate `dexa_attendance_log` for notification logs) |
| Inter-service | gRPC (Gateway↔Auth, Employee↔Auth, Attendance↔Employee) |
| Client↔Gateway | REST over HTTP, Bearer JWT |
| Message queue | RabbitMQ (notification events) |
| Real-time | Socket.IO (notification-service, namespace `/admin`) |
| Storage | S3-compatible (profile photos, optional) |

---

## Service Summary

| Service | Port (HTTP) | gRPC Port | Role |
|---------|-------------|-----------|------|
| **gateway** | 3000 | — | Entry point, JWT validation, proxy |
| **auth-service** | 3010 | 50010 | Login, refresh, logout, sessions; gRPC token and user ops |
| **attendance-service** | 3020 | — | Attendance records and summaries |
| **notification-service** | 3030 | — | WebSocket for admins; RabbitMQ consumer; log DB |
| **employee-service** | 3050 | 50020 | Employees and profile; Auth gRPC; RabbitMQ publisher |

---

## Request Flow (high level)

1. **Login** — Client sends `POST /auth/login` with `x-api-key` and credentials. Gateway forwards to Auth; Auth returns access and refresh tokens.
2. **Authenticated requests** — Client sends `Authorization: Bearer <access_token>`. Gateway calls Auth gRPC `CheckAccessToken`; on success it adds `x-user-credentials` (base64) and `x-gateway-signature` (HMAC-SHA256) and forwards the request to the target service. The service uses the credentials for user/role and may verify the signature.
3. **Refresh** — `GET /auth/refresh` with Bearer refresh token. Gateway validates via gRPC, then calls Auth HTTP refresh with derived credentials; new tokens returned to client.
4. **Profile / password change** — Employee service updates DB and/or calls Auth gRPC; on change it publishes to RabbitMQ. Notification service consumes, writes to log DB, and broadcasts to WebSocket clients in `/admin`.
5. **Attendance** — Attendance service receives request with credentials, resolves `employeeId`, calls Employee gRPC to verify employee, then creates or lists records.

---

## Scheduled Jobs

| Service | Cron | Job |
|---------|------|-----|
| **auth-service** | `0 0 * * *` | `deactivateStaleSessions` (inactive > 3 days) |
| **auth-service** | `0 0 * * *` | `deactivateExpiredSessionsOverThreeMonths` (session age > 3 months) |
| **attendance-service** | `0 0 * * *` | Auto clock-out previous-day open attendances (`IN` without `OUT`) |

---

## Design: Schema & Data Boundaries (No FK / No Cross-Service Join)

**We intentionally design schemas and services as if each microservice had its own database.** Even though the current setup can use a single PostgreSQL instance with separate schemas (`auth`, `employee`, `attendance`), the architecture assumes **separate databases per service**. Therefore:

- **No foreign keys (FK)** are defined between tables that belong to different services (e.g. no FK from `attendance.attendances.employee_id` to `employee.employees.id`).
- **No cross-schema or cross-database JOINs** are used to fetch related data. Each service owns and queries only its own schema.

**Rationale:** If services later move to different DBs (or different instances), the same code and schema design still hold. Referential consistency is enforced **at the application layer** via gRPC (e.g. Attendance service calls Employee gRPC to verify an employee exists and is active before creating an attendance record). Data that must be shown together (e.g. employee name on an attendance row) is assembled in the service that needs it by calling other services (gRPC) and merging in memory, not via SQL JOINs.

This keeps service boundaries clear and makes it safe to split databases later without changing the application logic.

---

## Databases

- **dexa_attendance** — Main app. Schemas: `auth` (users, sessions), `employee` (employees), `attendance` (attendances). Migrations live in each service’s `migrations/` folder. Tables in one schema do **not** reference tables in another via FK.
- **dexa_attendance_log** — Used by Notification service for `notification.notification_logs`. Schema/table can be created automatically on first insert.

PostgreSQL user: `dexa_app`. Create DBs and run migrations (e.g. from `docker/postgres/init` and each service’s migration scripts) before running services.

---

## Prerequisites

- Node.js (LTS)
- PostgreSQL (e.g. via Docker: `docker/run-postgres.sh`)
- RabbitMQ (e.g. via Docker: `docker/run-rabbitmq.sh`)
- Optional: S3-compatible storage for employee profile photos

---

## How to Run

**From repo root:**

```bash
# Start infrastructure (if using project Docker scripts)
./docker/run-postgres.sh
./docker/run-rabbitmq.sh

# Run all backend services
cd backend
npm install
npm run start:all
```

**Or run services individually:**

```bash
cd backend
npm run start:gateway      # 3000
npm run start:auth         # 3010, gRPC 50010
npm run start:employee     # 3050, gRPC 50020
npm run start:attendance   # 3020
npm run start:notification # 3030
```

Ensure `.env` (or env vars) in each service directory are set for DB, RabbitMQ, Auth gRPC URL, and (for employee) S3 and notification queue name. See each service’s README for details.

---

## Docker Images

Dockerfiles are available for all backend services:

- `backend/gateway/Dockerfile`
- `backend/auth-service/Dockerfile`
- `backend/attendance-service/Dockerfile`
- `backend/employee-service/Dockerfile`
- `backend/notification-service/Dockerfile`

Example builds from repository root:

```bash
docker build -t dexa-gateway:latest ./backend/gateway
docker build -t dexa-auth-service:latest ./backend/auth-service
docker build -t dexa-attendance-service:latest ./backend/attendance-service
docker build -t dexa-employee-service:latest ./backend/employee-service
docker build -t dexa-notification-service:latest ./backend/notification-service
```

Run examples:

```bash
docker run --rm -p 3000:3000 --env-file ./backend/gateway/.env dexa-gateway:latest
docker run --rm -p 3010:3010 --env-file ./backend/auth-service/.env dexa-auth-service:latest
docker run --rm -p 3020:3020 --env-file ./backend/attendance-service/.env dexa-attendance-service:latest
docker run --rm -p 3050:3050 --env-file ./backend/employee-service/.env dexa-employee-service:latest
docker run --rm -p 3030:3030 --env-file ./backend/notification-service/.env dexa-notification-service:latest
```

For multi-service deployments, prefer Docker Compose so services can share one virtual network and use service names in env URLs.

---

## Path Routing (Gateway → Services)

The gateway forwards the **full path** to the downstream service. For example, a request to `GET http://localhost:3000/employee/employees/me` is sent to the Employee service as `GET {EMPLOYEE_HTTP_URL}/employee/employees/me`. So each microservice must serve routes under the same prefix the gateway uses:

- Auth: `/auth/*` (e.g. `/auth/login`, `/auth/refresh`, `/auth/logout`)
- Employee: `/employee/*` (e.g. `/employee/employees/me`, `/employee/employees/admin`)
- Attendance: `/attendance/*` (e.g. `/attendance/attendances`, `/attendance/attendances/me`, `/attendance/attendances/admin`)
- Notification: `/notification/*` (used for HTTP server; WebSocket and consumer are the main entry points)

If a service is mounted at root (no global prefix), either set a global prefix in that service (e.g. `app.setGlobalPrefix('employee')`) or run a reverse proxy that strips the prefix before forwarding.

---

## Documentation

- **[gateway/README.md](gateway/README.md)** — Gateway behaviour, routing, env.
- **[auth-service/README.md](auth-service/README.md)** — Auth HTTP and gRPC, sessions, DB.
- **[employee-service/README.md](employee-service/README.md)** — Profile, admin CRUD, gRPC, RabbitMQ.
- **[attendance-service/README.md](attendance-service/README.md)** — Attendance APIs and rules.
- **[notification-service/README.md](notification-service/README.md)** — WebSocket, RabbitMQ consumer, log DB.

All READMEs are in English and describe features, logic, and how to run each service.
