# Notification Service

NestJS service that **consumes notification events from RabbitMQ**, **writes them to a separate log database**, and **broadcasts real-time notifications to admin clients** over WebSocket (Socket.IO). It does not expose REST APIs for business logic; the main entry points are the WebSocket namespace and the RabbitMQ consumer.

## Features

- **RabbitMQ consumer** — Subscribes to a durable queue (e.g. `notification.events`). On each message (JSON payload: `type`, `actorUserId`, `actorEmail`, `actorRole`, `occurredAtIso`, `meta`), it inserts a row into the log DB and broadcasts the same payload to connected admin clients. Retries connection on failure so the service can start before RabbitMQ is up.
- **WebSocket (Socket.IO)** — Namespace `/admin`. Clients must connect with a valid JWT access token (Bearer or query/auth); only `ADMIN_HR` role is allowed. After connection, clients receive `admin:notification` events for every consumed message (e.g. `EMPLOYEE_UPDATED`, `EMPLOYEE_PASSWORD_CHANGED`). Ping/pong heartbeat is handled by Socket.IO.
- **Log database** — Each event is stored in `dexa_attendance_log.notification.notification_logs` (id, event_type, actor_user_id, actor_email, actor_role, created_at_iso, meta). Schema and table are created on first insert if missing.

## Architecture

- **Application** — `HandleNotificationEventUseCase`: orchestrate insert + broadcast.
- **Infrastructure** — RabbitMQ consumer (amqplib), PostgreSQL pool and `NotificationLogRepository`, AppLogger.
- **Presentation** — WebSocket gateway (`AdminNotificationGateway`): JWT validation, role check, join to `admin` room, `broadcastToAdmins`. No REST controllers.

JWT for WebSocket must use the same secret as the auth service (or a shared secret) so that tokens issued at login are valid here. Expired or invalid tokens are rejected (e.g. `JWT_EXPIRED`, `JWT_INVALID`); handshake failures are logged.

## API (WebSocket)

- **URL (example):** `http://localhost:3030` (Socket.IO default path `/socket.io`).
- **Namespace:** `/admin`.
- **Authentication:** Send JWT access token via handshake: `auth.token`, query `token`, or `Authorization: Bearer <token>`. Only role `ADMIN_HR` is accepted; others are disconnected.
- **Events (server → client):** `admin:notification` — payload is the same as the RabbitMQ message (type, actorUserId, actorEmail, actorRole, createdAtIso/occurredAtIso, meta).
- **Events (client → server):** `admin:ping` — optional; server may respond for keep-alive.

No REST endpoints for notifications; event ingestion is only via RabbitMQ.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP/WebSocket server port | `3030` |
| `JWT_SECRET` | Must match auth (or shared) for WebSocket JWT | `super-secret-dev-key` |
| `RABBITMQ_URL`, `NOTIFICATION_QUEUE_NAME` | Consumer queue | `notification.events` |
| `DB_*` | PostgreSQL for **log** DB | `dexa_attendance_log` |
| `LOG_LEVEL` | `DEBUG`, `WARN`, `ERROR` | `DEBUG` |

## Database

- **Database:** `dexa_attendance_log` (separate from main app DB).
- **Schema/table:** `notification.notification_logs`. Created automatically on first insert.

## How to Run

```bash
cd backend/notification-service
npm install
# Configure .env (JWT_SECRET, RabbitMQ, DB for log)
npm run start:dev
```

Or from `backend`: `npm run start:notification`.

Requires: PostgreSQL (log DB), RabbitMQ. For admin clients to receive events, Employee service (or other publishers) must publish to the same queue with the expected JSON shape.

## Docker

Build image:

```bash
docker build -t dexa-notification-service:latest ./backend/notification-service
```

Run container:

```bash
docker run --rm -p 3030:3030 --env-file ./backend/notification-service/.env dexa-notification-service:latest
```

Notes:

- This container serves WebSocket endpoint (`/admin` namespace over Socket.IO) on port `3030`.
- It also runs RabbitMQ consumer in the same process.
