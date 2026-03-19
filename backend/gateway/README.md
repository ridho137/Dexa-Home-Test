# API Gateway

Single entry point for all client requests. It performs **authentication** (via gRPC to the Auth service), then **forwards requests as-is** to the appropriate microservice over HTTP, injecting headers so downstream services can trust and identify the caller.

## Features

- **Routing** — Path-based mapping to services:
  - `/auth/*` → Auth service
  - `/employee/*` → Employee service
  - `/attendance/*` → Attendance service
  - `/notification/*` → Notification service
- **Auth handling**
  - **Login:** `/auth/login` is forwarded to the Auth service without token checks; client must send `x-api-key`.
  - **Refresh:** `GET /auth/refresh` is handled by the gateway: it validates the refresh token via gRPC, then calls the Auth service HTTP refresh endpoint with derived credentials.
  - **All other routes:** Require `Authorization: Bearer <access_token>`. Gateway validates the access token with the Auth service gRPC (`CheckAccessToken`), then forwards the request to the target service with two extra headers:
    - `x-user-credentials` — Base64-encoded JSON: `{ userId, email, role, sessionId }`.
    - `x-gateway-signature` — HMAC-SHA256 of the credentials body using a shared secret, so downstream services can verify the request came from the gateway.
- **Proxy** — Method, path, query string, and body (including multipart) are forwarded unchanged. Response status, headers, and body are returned to the client as returned by the downstream service.
- **404** — If the path does not match any service prefix, the gateway returns 404 (e.g. `ROUTE_NOT_MAPPED`).

## Architecture

- **Auth** — gRPC client for Auth service (token checks), HTTP client for auth refresh. Dedicated controller for `GET /auth/refresh`.
- **Proxy** — Single catch-all controller that validates token (except login), builds credentials + signature, and uses `ProxyService` to forward the request.
- **Config** — `service-map` resolves path prefix to base URL and full path; env holds gateway port, Auth gRPC URL, per-service HTTP URLs, and signing secret.

No business logic or database; the gateway only authenticates and proxies.

## API (as seen by the client)

- **Base URL:** `http://localhost:3000` (or configured `PORT`).
- **Login:** `POST /auth/login` with `x-api-key` and body `{ email, password }` → returns `{ accessToken, refreshToken }`.
- **Refresh:** `GET /auth/refresh` with `Authorization: Bearer <refresh_token>` → returns new `{ accessToken, refreshToken }` (or equivalent from Auth).
- **Logout:** `DELETE /auth/logout` with `Authorization: Bearer <access_token>`.
- **All other resources:** Use the same paths as in each service README, with the prefixes above (e.g. `GET /employee/employees/me`, `POST /attendance/attendances`). Send `Authorization: Bearer <access_token>`.

Query parameters and request bodies are forwarded; the gateway does not rewrite them.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Gateway HTTP port | `3000` |
| `AUTH_GRPC_URL` | Auth service gRPC address | `localhost:50010` |
| `AUTH_HTTP_URL` | Auth service HTTP base URL | `http://localhost:3010` |
| `EMPLOYEE_HTTP_URL` | Employee service HTTP base URL | `http://localhost:3050` |
| `ATTENDANCE_HTTP_URL` | Attendance service HTTP base URL | `http://localhost:3020` |
| `NOTIFICATION_HTTP_URL` | Notification service HTTP base URL | `http://localhost:3030` |
| `GATEWAY_SIGNING_SECRET` | Shared secret for `x-gateway-signature` | `dev-gateway-secret` |

Downstream services must be configured to accept the full path (e.g. `/employee/employees/me`) or the gateway and services must agree on path stripping; see the main backend README.

## How to Run

```bash
cd backend/gateway
npm install
# Configure .env (ports and URLs)
npm run start:dev
```

Or from `backend`: `npm run start:gateway`.

Requires the Auth service (gRPC) to be reachable for token validation. Other services are only needed when their routes are called.

## Docker

Build image from repository root:

```bash
docker build -t dexa-gateway:latest ./backend/gateway
```

Run container:

```bash
docker run --rm -p 3000:3000 --env-file ./backend/gateway/.env dexa-gateway:latest
```

Notes:

- The Dockerfile runs `node dist/main` in production mode.
- Ensure all downstream service URLs and Auth gRPC URL in env are reachable from container network.
