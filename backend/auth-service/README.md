# Auth Service

NestJS microservice responsible for **authentication**, **sessions**, and **user credentials**. It exposes HTTP endpoints for login, refresh, and logout, and a gRPC server for token validation used by the API Gateway and other services.

## Features

- **Login** — Email + password authentication. Protected by API key (`x-api-key`). Creates a session and returns JWT access token (short-lived) and refresh token (long-lived).
- **Refresh** — Exchange a valid refresh token for a new access token. Intended to be called via the Gateway with credentials; can also validate refresh token via gRPC.
- **Logout** — Invalidate the current session. Expects credentials from the Gateway (no JWT verification on HTTP; gateway already validated the token).
- **Session management** — Sessions stored in DB with `last_activity_at` and `last_refresh_at`. Includes daily cleanup schedulers for inactivity and long-lived sessions.
- **gRPC** — Used by the Gateway for `CheckAccessToken` and `CheckRefreshToken`, and by the Employee service for `ChangePassword` and `CreateUser`.

## Architecture

The service follows a **clean architecture** style:

- **Domain** — Entities and interfaces (e.g. `User`, `Session`, `UserRepository`, `SessionRepository`, `PasswordHasher`).
- **Application** — Use cases: `LoginUseCase`, `RefreshTokenUseCase`, `LogoutUseCase`, `ChangePasswordUseCase`, `CreateUserUseCase`.
- **Infrastructure** — PostgreSQL repositories, Bcrypt hasher, JWT signing, gRPC server implementation.
- **Presentation** — HTTP controller (`AuthController`), gRPC controller (`AuthGrpcController`), DTOs, and middleware.

**Security:**

- Login is the only HTTP endpoint that requires `x-api-key`; refresh and logout are intended to be called via the Gateway and rely on `x-user-credentials` + `x-gateway-signature`.
- Middleware ensures that non-login auth routes are only accepted when the request comes from the Gateway (signature verification).

## API (HTTP)

When calling **via the API Gateway** (recommended), use base path `/auth`. Direct calls to this service use the same paths on the service port.

| Method | Path        | Description                    | Auth        |
|--------|-------------|--------------------------------|-------------|
| POST   | `/auth/login` | Login with email & password   | `x-api-key` |
| GET    | `/auth/refresh` | Get new access token          | Bearer (refresh token) |
| DELETE | `/auth/logout`  | Invalidate current session    | Bearer (access) + Gateway credentials |

**Login request body:** `{ "email": string, "password": string }`  
**Login response:** `{ "accessToken": string, "refreshToken": string }`

Password policy (enforced at DTO): minimum 8 characters, at least one uppercase, one lowercase, one number, one symbol.

## gRPC

- **Package:** `auth`
- **Port:** Configurable via `GRPC_PORT` (default `50010`).

RPCs:

- `CheckAccessToken` — Validates access token, returns user id, email, role, session id; updates session `last_activity_at`.
- `CheckRefreshToken` — Validates refresh token, returns user id, session id, email, role.
- `ChangePassword` — Updates user password by id (used by Employee service).
- `CreateUser` — Creates a new user (id, email, hashed password, role); used when creating an employee.

## Schedulers

The service includes two independent daily schedulers (both run at `00:00` server time):

- **`deactivateStaleSessions()`**
  - Deactivates active sessions with missing `last_activity_at` or inactivity longer than `3 days`.
  - Existing maintenance behavior (kept unchanged).
- **`deactivateExpiredSessionsOverThreeMonths()`**
  - Deactivates active sessions older than `3 months` based on `created_at`.
  - Separate policy for long-lived session cutoff.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | `3010` |
| `GRPC_PORT` | gRPC server port | `50010` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | PostgreSQL connection | `dexa_attendance` |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Access token signing | `10m` |
| `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN` | Refresh token | `90d` |
| `AUTH_API_KEY` | Required for login | `dev-auth-key` |
| `GATEWAY_SIGNING_SECRET` | Verify gateway requests | `dev-gateway-secret` |
| `LOG_LEVEL` | `DEBUG`, `WARN`, `ERROR` | `DEBUG` |

## Database

- **Database:** `dexa_attendance` (shared with other services).
- **Schema:** `auth`.
- **Tables:** `users`, `sessions`.

Migrations:

- `migrations/001_auth_up.sql` — Create schema, tables, indexes, seed admin user.
- `migrations/001_auth_down.sql` — Teardown.

Run them manually with `psql` or your migration tool against the target database.

## How to Run

```bash
# From repo root
cd backend/auth-service
npm install
cp .env.example .env   # if present; otherwise set env vars
npm run start:dev
```

Or from `backend`: `npm run start:auth`.

Requires PostgreSQL running and migrations applied. The Gateway and Employee service need to reach this service’s HTTP and gRPC ports.

## Docker

Build image:

```bash
docker build -t dexa-auth-service:latest ./backend/auth-service
```

Run container:

```bash
docker run --rm -p 3010:3010 --env-file ./backend/auth-service/.env dexa-auth-service:latest
```

Notes:

- The container serves the HTTP app on port `3010`.
- gRPC port is controlled by env (`GRPC_PORT`) and must be exposed in orchestration if needed.
