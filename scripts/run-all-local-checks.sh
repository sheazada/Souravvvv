#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_HELPER="$ROOT_DIR/scripts/run-frontend-ui-suites.sh"
SERVICE_NAME="dairy-erp-test-db"
CONTAINER_NAME="dairy-erp-test-db"
HEALTH_RETRIES="${HEALTH_RETRIES:-30}"
HEALTH_SLEEP_SECONDS="${HEALTH_SLEEP_SECONDS:-2}"
SKIP_INSTALL="${SKIP_INSTALL:-0}"
RUN_BACKEND="${RUN_BACKEND:-1}"
RUN_FRONTEND="${RUN_FRONTEND:-1}"

if [[ "$RUN_BACKEND" != "1" && "$RUN_FRONTEND" != "1" ]]; then
  echo "Error: RUN_BACKEND and RUN_FRONTEND cannot both be disabled." >&2
  exit 1
fi

if [[ "$RUN_BACKEND" == "1" ]]; then
  check_local_postgres() {
    if command -v pg_isready >/dev/null 2>&1 && pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
      return 0
    elif command -v nc >/dev/null 2>&1 && nc -z localhost 5432 >/dev/null 2>&1; then
      return 0
    elif (echo > /dev/tcp/localhost/5432) >/dev/null 2>&1; then
      return 0
    fi
    return 1
  }

  if check_local_postgres; then
    echo ">>> Local PostgreSQL detected on port 5432, proceeding without Docker"
  elif command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1 && [[ "${SKIP_DOCKER:-0}" != "1" ]]; then
    if docker compose version >/dev/null 2>&1; then
      DOCKER_COMPOSE=(docker compose)
    elif command -v docker-compose >/dev/null 2>&1; then
      DOCKER_COMPOSE=(docker-compose)
    else
      echo "Error: Docker Compose is required but not available." >&2
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
  else
    echo "Error: Docker is not running and local PostgreSQL is not reachable on localhost:5432." >&2
    exit 1
  fi

  cd "$BACKEND_DIR"

  echo ">>> Loading backend test profile from .env.test"
  set -a
  source .env.test
  set +a

  if [[ "$SKIP_INSTALL" != "1" ]]; then
    echo ">>> Installing backend dependencies"
    npm ci
  else
    echo ">>> SKIP_INSTALL=1 set, skipping backend npm ci"
  fi

  echo ">>> Generating backend Prisma client"
  npm run prisma:generate

  echo ">>> Running backend full local CI-equivalent checks"
  npm run test:ci:local
fi

if [[ "$RUN_FRONTEND" == "1" ]]; then
  echo ">>> Running frontend UI checks"
  if [[ "$SKIP_INSTALL" == "1" ]]; then
    SKIP_INSTALL=1 bash "$FRONTEND_HELPER" all
  else
    bash "$FRONTEND_HELPER" all
  fi
fi

echo ">>> All requested local checks completed successfully"
