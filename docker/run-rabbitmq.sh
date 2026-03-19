#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="${RABBITMQ_CONTAINER_NAME:-dexa-rabbitmq}"
RABBITMQ_IMAGE="${RABBITMQ_IMAGE:-rabbitmq:3-management}"

# Default credentials (change via env vars if you want).
RABBITMQ_USER="${RABBITMQ_USER:-dexa_app}"
RABBITMQ_PASS="${RABBITMQ_PASS:-D3x@2026_Rabbit}"

VOLUME_NAME="${RABBITMQ_VOLUME_NAME:-dexa-rabbitmq-data}"

PORT_AMQP="${RABBITMQ_PORT_AMQP:-5672}"
PORT_HTTP="${RABBITMQ_PORT_HTTP:-15672}"

if docker inspect "$CONTAINER_NAME" >/dev/null 2>&1; then
  if [[ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME")" == "true" ]]; then
    echo "RabbitMQ container '$CONTAINER_NAME' is already running."
    exit 0
  fi
  echo "Starting existing RabbitMQ container '$CONTAINER_NAME'..."
  docker start "$CONTAINER_NAME" >/dev/null
  exit 0
fi

docker volume create "$VOLUME_NAME" >/dev/null 2>&1 || true

echo "Running RabbitMQ container '$CONTAINER_NAME'..."
docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p "${PORT_AMQP}:5672" \
  -p "${PORT_HTTP}:15672" \
  -e RABBITMQ_DEFAULT_USER="$RABBITMQ_USER" \
  -e RABBITMQ_DEFAULT_PASS="$RABBITMQ_PASS" \
  -v "${VOLUME_NAME}:/var/lib/rabbitmq" \
  "$RABBITMQ_IMAGE" >/dev/null

echo "RabbitMQ is ready."
echo "AMQP:  localhost:${PORT_AMQP}"
echo "UI:    http://localhost:${PORT_HTTP}"
echo "User:  $RABBITMQ_USER"

