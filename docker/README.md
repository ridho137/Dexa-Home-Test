# Docker — Local Infrastructure

Scripts to run **PostgreSQL** and **RabbitMQ** in Docker for local development. Used by the backend microservices (auth, employee, attendance, notification).

---

## Scripts

| Script | Purpose |
|--------|---------|
| **run-postgres.sh** | Start a PostgreSQL container. Creates a volume and runs init SQL on first start. |
| **run-rabbitmq.sh** | Start a RabbitMQ container with the management UI. |
| **start-all.sh** | Run both Postgres and RabbitMQ in sequence. |

Run from the **repository root** (or from `docker/`):

```bash
# From repo root
./docker/run-postgres.sh
./docker/run-rabbitmq.sh

# Or start both at once
./docker/start-all.sh
```

Ensure the scripts are executable: `chmod +x docker/*.sh docker/start-all.sh` if needed.

---

## PostgreSQL

- **Container name:** `dexa-pg` (override: `POSTGRES_CONTAINER_NAME`)
- **Image:** `postgres:18` (override: `POSTGRES_IMAGE`)
- **Host port:** `5432` (override: `POSTGRES_PORT`)
- **Volume:** `dexa-pg-data` (override: `POSTGRES_VOLUME_NAME`) — data persists across container restarts.

**Superuser (image default):** `postgres` / `D3x@2026` (override: `POSTGRES_USER`, `POSTGRES_PASSWORD`). Used only for container bootstrap.

**Init (first run only):** The `postgres/init/001-init.sql` script runs when the volume is created for the first time. It:

- Creates role **`dexa_app`** with password **`D3x@2026_App`** (used by all backend services).
- Creates databases **`dexa_attendance`** (main app) and **`dexa_attendance_log`** (notification logs).
- Sets ownership and grants so `dexa_app` can use both databases.

**Timezone:** `Asia/Jakarta` by default (override: `POSTGRES_TZ`).

After Postgres is up, run each service’s migrations (see [backend/README.md](../backend/README.md)) to create schemas and tables.

---

## RabbitMQ

- **Container name:** `dexa-rabbitmq` (override: `RABBITMQ_CONTAINER_NAME`)
- **Image:** `rabbitmq:3-management` (override: `RABBITMQ_IMAGE`)
- **AMQP port:** `5672` (override: `RABBITMQ_PORT_AMQP`) — used by employee-service (publisher) and notification-service (consumer).
- **Management UI:** `15672` (override: `RABBITMQ_PORT_HTTP`) — open http://localhost:15672 in a browser.
- **Volume:** `dexa-rabbitmq-data` (override: `RABBITMQ_VOLUME_NAME`).

**Credentials:** User **`dexa_app`**, password **`D3x@2026_Rabbit`** (override: `RABBITMQ_USER`, `RABBITMQ_PASS`). Set the same values in backend `.env` files (e.g. `RABBITMQ_URL=amqp://dexa_app:D3x@2026_Rabbit@localhost:5672/`).

---

## Environment Overrides (summary)

| Variable | Default | Used by |
|----------|---------|---------|
| `POSTGRES_CONTAINER_NAME` | `dexa-pg` | run-postgres.sh |
| `POSTGRES_IMAGE` | `postgres:18` | run-postgres.sh |
| `POSTGRES_PORT` | `5432` | run-postgres.sh |
| `POSTGRES_VOLUME_NAME` | `dexa-pg-data` | run-postgres.sh |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` | `postgres` / `D3x@2026` | run-postgres.sh |
| `POSTGRES_TZ` | `Asia/Jakarta` | run-postgres.sh |
| `RABBITMQ_CONTAINER_NAME` | `dexa-rabbitmq` | run-rabbitmq.sh |
| `RABBITMQ_IMAGE` | `rabbitmq:3-management` | run-rabbitmq.sh |
| `RABBITMQ_PORT_AMQP` | `5672` | run-rabbitmq.sh |
| `RABBITMQ_PORT_HTTP` | `15672` | run-rabbitmq.sh |
| `RABBITMQ_USER` / `RABBITMQ_PASS` | `dexa_app` / `D3x@2026_Rabbit` | run-rabbitmq.sh |
| `RABBITMQ_VOLUME_NAME` | `dexa-rabbitmq-data` | run-rabbitmq.sh |

---

## Behaviour

- If a container with the same name **already exists** and is **running**, the script prints a message and exits without creating a new one.
- If the container exists but is **stopped**, the script **starts** it.
- Otherwise it **creates** the volume (if needed) and **runs** a new container.
- Init SQL for Postgres runs only when the volume is first created; re-running the script or restarting the container does not re-run it.

To reset Postgres data, remove the volume and container, then run the script again:

```bash
docker stop dexa-pg
docker rm dexa-pg
docker volume rm dexa-pg-data
./docker/run-postgres.sh
```
