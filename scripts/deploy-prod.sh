#!/usr/bin/env bash
set -euo pipefail

# Dairy Distributor ERP — Production Orchestration & Deployment Script
# Usage: ./scripts/deploy-prod.sh [--seed] [--down]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

if [[ "${1:-}" == "--down" ]]; then
  echo ">>> Tearing down Dairy Distributor ERP production stack..."
  docker compose -f docker-compose.prod.yml down
  echo ">>> Production stack torn down successfully."
  exit 0
fi

echo "=========================================================="
echo " Starting Dairy Distributor ERP Production Deployment"
echo "=========================================================="

# Check for Docker and Docker Compose
if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker is required to deploy the production stack."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: Docker Compose V2 (docker compose) is required."
  exit 1
fi

# Set default credentials if environment variables are not supplied
export POSTGRES_USER="${POSTGRES_USER:-postgres}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-SudhaProdSecure@2026}"
export POSTGRES_DB="${POSTGRES_DB:-dairy_erp_prod}"
export JWT_SECRET="${JWT_SECRET:-SudhaProdJwtSecretKey@2026_ERP_Pro}"
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:4000/api/v1}"

echo ">>> Building and deploying container services via docker-compose.prod.yml..."
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans

echo ">>> Waiting for PostgreSQL cluster health check..."
until docker compose -f docker-compose.prod.yml exec postgres-prod pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; do
  echo "    Waiting for postgres-prod..."
  sleep 2
done
echo ">>> PostgreSQL database is healthy and accepting connections."

if [[ "${1:-}" == "--seed" ]]; then
  echo ">>> Running initial Sudha master data seeding inside backend-api container..."
  docker compose -f docker-compose.prod.yml exec backend-api sh -c "cd backend && npx prisma db push --schema ../prisma/schema.prisma && npx tsx ../prisma/seed.ts"
  echo ">>> Initial master seeding completed successfully."
fi

echo "=========================================================="
echo " Deployment Complete!"
echo " Backend API Listening on : http://localhost:4000/api/v1"
echo " Frontend PWA Listening on: http://localhost:3000"
echo "=========================================================="
