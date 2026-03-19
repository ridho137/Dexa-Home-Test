#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-dexa-pg}"
IMAGE="${POSTGRES_IMAGE:-postgres:18}"

# Superuser credentials for the Postgres image itself.
# (We will also create our app role + databases via init SQL.)
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-D3x@2026}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"

VOLUME_NAME="${POSTGRES_VOLUME_NAME:-dexa-pg-data}"

PORT_PG="${POSTGRES_PORT:-5432}"
TZ="${POSTGRES_TZ:-Asia/Jakarta}"

INIT_SQL_DIR="/docker/postgres/init"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INIT_PATH="${SCRIPT_DIR}/postgres/init"

if docker inspect "$CONTAINER_NAME" >/dev/null 2>&1; then
  if [[ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME")" == "true" ]]; then
    echo "Postgres container '$CONTAINER_NAME' is already running."
    exit 0
  fi
  echo "Starting existing Postgres container '$CONTAINER_NAME'..."
  docker start "$CONTAINER_NAME" >/dev/null
  exit 0
fi

docker volume create "$VOLUME_NAME" >/dev/null 2>&1 || true

echo "Running Postgres container '$CONTAINER_NAME'..."
docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -e "POSTGRES_PASSWORD=${POSTGRES_PASSWORD}" \
  -e "POSTGRES_USER=${POSTGRES_USER}" \
  -e "TZ=${TZ}" \
  -p "${PORT_PG}:5432" \
  -v "${VOLUME_NAME}:/var/lib/postgresql" \
  -v "${INIT_PATH}:/docker-entrypoint-initdb.d" \
  "$IMAGE" >/dev/null

echo "Postgres is ready (initdb runs only on first volume initialization)."
echo "Host port: ${PORT_PG}"

