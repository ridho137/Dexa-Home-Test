#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

bash "${ROOT_DIR}/run-postgres.sh"
bash "${ROOT_DIR}/run-rabbitmq.sh"

echo "All infra services started."

