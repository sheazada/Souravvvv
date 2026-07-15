#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
SERVICE_NAME="dairy-erp-test-db"
CONTAINER_NAME="dairy-erp-test-db"
DEFAULT_SCRIPT="test:e2e:prisma:http"
HEALTH_RETRIES="${HEALTH_RETRIES:-30}"
HEALTH_SLEEP_SECONDS="${HEALTH_SLEEP_SECONDS:-2}"
SKIP_INSTALL="${SKIP_INSTALL:-0}"

resolve_script_name() {
  case "$1" in
    all)
      echo "test:e2e:prisma:http"
      ;;
    products)
      echo "test:e2e:prisma:http-products"
      ;;
    lookups)
      echo "test:e2e:prisma:http-lookups"
      ;;
    purchase-orders)
      echo "test:e2e:prisma:http-purchase-orders"
      ;;
    *)
      echo "$1"
      ;;
  esac
}

if command -v docker >/dev/null 2>&1; then
  if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE=(docker-compose)
  else
    echo "Error: Docker Compose is required but not available." >&2
    exit 1
  fi
else
  echo "Error: docker is required to boot the Prisma test database." >&2
  exit 1
fi

echo ">>> Starting disposable PostgreSQL test DB via Docker Compose"
"${DOCKER_COMPOSE[@]}" -f "$ROOT_DIR/docker-compose.yml" up -d "$SERVICE_NAME"

echo ">>> Waiting for PostgreSQL health check"
for ((i=1; i<=HEALTH_RETRIES; i++)); do
  health_status="$({ docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$CONTAINER_NAME"; } 2>/dev/null || true)"
  if [[ "$health_status" == "healthy" || "$health_status" == "running" ]]; then
    echo ">>> PostgreSQL container is ready: $health_status"
    break
  fi

  if (( i == HEALTH_RETRIES )); then
    echo "Error: PostgreSQL test DB did not become ready in time." >&2
    "${DOCKER_COMPOSE[@]}" -f "$ROOT_DIR/docker-compose.yml" ps
    exit 1
  fi

  sleep "$HEALTH_SLEEP_SECONDS"
done

cd "$BACKEND_DIR"

echo ">>> Loading backend test profile from .env.test"
set -a
source .env.test
set +a

if [[ "$SKIP_INSTALL" != "1" ]]; then
  echo ">>> Installing backend dependencies"
  npm ci
else
  echo ">>> SKIP_INSTALL=1 set, skipping npm ci"
fi

echo ">>> Generating Prisma client"
npm run prisma:generate

echo ">>> Preparing/resetting Prisma test database"
npm run test:e2e:prisma:prepare

if [[ "$#" -eq 0 ]]; then
  scripts=("$DEFAULT_SCRIPT")
else
  scripts=()
  for raw_arg in "$@"; do
    scripts+=("$(resolve_script_name "$raw_arg")")
  done
fi

echo ">>> Resolved Prisma suite targets: ${scripts[*]}"

for script_name in "${scripts[@]}"; do
  echo ">>> Running backend npm script: $script_name"
  npm run "$script_name"
done

echo ">>> Prisma-backed backend test run completed successfully"
