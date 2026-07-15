# Dairy Distributor ERP

[![Backend CI + Prisma E2E](https://github.com/sheazada/DAIRY-FLOW-PRO/actions/workflows/backend-prisma-e2e.yml/badge.svg)](https://github.com/sheazada/DAIRY-FLOW-PRO/actions/workflows/backend-prisma-e2e.yml)
[![Frontend UI Tests](https://github.com/sheazada/DAIRY-FLOW-PRO/actions/workflows/frontend-ui-tests.yml/badge.svg)](https://github.com/sheazada/DAIRY-FLOW-PRO/actions/workflows/frontend-ui-tests.yml)

Enterprise-grade **Dairy Distributor ERP** for a **Sudha Dairy distributor**, built as an API-first, mobile-first system for:
- admin / owner
- accountant / operations staff
- delivery staff
- retailers / shops

## Repository structure
- `backend/` — NestJS + Prisma + PostgreSQL API
- `frontend/` — Next.js frontend
- `prisma/` — shared Prisma schema and seed files
- `.github/workflows/` — CI workflows

## CI workflows
### Backend
The backend CI workflow is defined in:

- `.github/workflows/backend-prisma-e2e.yml`

It runs:
- TypeScript compile check
- Nest build
- service/integration tests
- mocked HTTP e2e tests
- Prisma-backed HTTP e2e tests

### Frontend
The frontend UI test workflow is defined in:

- `.github/workflows/frontend-ui-tests.yml`

It runs:
- frontend dependency install
- product-scope typecheck (`npm run typecheck:products`)
- full frontend typecheck (`npm run typecheck -- --pretty false`)
- `npm run test:lookups`
- `npm run test:products`
- `npm run test:operations`

Current frontend test grouping:
- lookups
- products
- operations (goods receipts, purchase orders, dispatch, inventory)

### GitHub branch protection / required checks
If you configure required status checks in GitHub branch protection, use these current job names:
- `backend-tests`
- `frontend-ui-tests`

## Backend test profiles
### Application env
- `backend/.env.example`

### CI/local disposable test env
- `backend/.env.test`
- `backend/.env.test.example`

The Prisma-backed backend e2e suite expects:
- `TEST_DATABASE_URL`
- `PAYMENT_GATEWAY_RAZORPAY_WEBHOOK_SECRET`

## Running backend CI locally

### Prerequisites
- Node.js 20+
- npm
- PostgreSQL 16+ or Docker

### Option A — quick local Postgres via Docker Compose
From the repository root:

```bash
docker compose up -d dairy-erp-test-db
```

To stop it later:

```bash
docker compose down
```

To stop it and remove the persisted test DB volume:

```bash
docker compose down -v
```

The Compose file is:
- `docker-compose.yml`

### Option A2 — direct Docker run
If you prefer a one-off container instead of Compose:

```bash
docker run --name dairy-erp-test-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=dairy_erp_test \
  -p 5432:5432 \
  -d postgres:16
```

To stop and remove it later:

```bash
docker rm -f dairy-erp-test-db
```

### Option B — existing local PostgreSQL
Create a dedicated disposable database, for example:

```sql
CREATE DATABASE dairy_erp_test;
```

## Local backend CI-equivalent run
From the `backend/` directory:

### 1. Install dependencies
```bash
npm ci
```

### 2. Load the backend test profile
Linux/macOS:

```bash
set -a
source .env.test
set +a
```

Windows PowerShell:

```powershell
Get-Content .env.test | ForEach-Object {
  if ($_ -match '^(?!#)([^=]+)=(.*)$') {
    [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
  }
}
```

### 3. Generate Prisma client
```bash
npm run prisma:generate
```

### 4. Prepare/reset the Prisma test database
```bash
npm run test:e2e:prisma:prepare
```

### 5. Run the full backend CI-equivalent sequence
```bash
npm run test:ci:local
```

## One-command Prisma-backed runner
From the repository root:

```bash
npm run test:backend:prisma
```

Equivalent direct script form:

```bash
./scripts/run-backend-prisma-suites.sh
```

Equivalent Makefile target:

```bash
make backend-prisma
```

For targeted real-DB suites, you can use friendly aliases:

```bash
./scripts/run-backend-prisma-suites.sh products
./scripts/run-backend-prisma-suites.sh lookups
./scripts/run-backend-prisma-suites.sh purchase-orders
./scripts/run-backend-prisma-suites.sh all

npm run test:backend:prisma:purchase-orders

make backend-prisma-products
make backend-prisma-lookups
make backend-prisma-purchase-orders
```

Raw npm script names still work too:

```bash
./scripts/run-backend-prisma-suites.sh test:e2e:prisma:http-products
./scripts/run-backend-prisma-suites.sh test:e2e:prisma:http-lookups
./scripts/run-backend-prisma-suites.sh test:e2e:prisma:http-purchase-orders
```

## Prisma local run troubleshooting
For common Prisma-backed backend test issues, see:
- `backend/README.md`

Typical problems covered there:
- missing `TEST_DATABASE_URL`
- local Postgres not running on `localhost:5432`
- stale Prisma client after schema changes
- force-reset safety warnings for disposable DB usage
- missing backend dependencies after environment reset

## Automation helper scripts
A small index of repo automation helpers is available at:
- `scripts/README.md`

Key helpers include:
- `.github/scripts/bootstrap-labels.sh`
- `backend/scripts/prepare-prisma-test-db.js`

## Useful backend test commands
### Service/integration tests
```bash
cd backend
npm run test:credit-control
npm run test:payments-integration
npm run test:credit-ops-integration
npm run test:retailer-notes
npm run test:sales-invoice-revision
```

### Mocked HTTP e2e tests
```bash
cd backend
npm run test:e2e:http
```

### Prisma-backed HTTP e2e tests
```bash
cd backend
npm run test:e2e:prisma:http
```

Includes retailer note, products, and lookups flows via:
```bash
cd backend
npm run test:e2e:prisma:http-retailer-notes
npm run test:e2e:prisma:http-products
npm run test:e2e:prisma:http-lookups
```

### Individual Prisma-backed suites
```bash
cd backend
npm run test:e2e:prisma:http-payments
npm run test:e2e:prisma:http-credit-ops
npm run test:e2e:prisma:http-sales-invoice-revision
npm run test:e2e:prisma:http-products
npm run test:e2e:prisma:http-lookups
```

## Frontend quick start
```bash
cd frontend
npm install
npm run dev
```

## One-command frontend UI runner
From the repository root:

```bash
npm run test:frontend:ui
```

Equivalent direct script form:

```bash
./scripts/run-frontend-ui-suites.sh
```

Equivalent Makefile target:

```bash
make frontend-ui
```

Useful aliases:

```bash
./scripts/run-frontend-ui-suites.sh lookups
./scripts/run-frontend-ui-suites.sh products
./scripts/run-frontend-ui-suites.sh operations
./scripts/run-frontend-ui-suites.sh dispatch
./scripts/run-frontend-ui-suites.sh inventory
./scripts/run-frontend-ui-suites.sh goods-receipts
./scripts/run-frontend-ui-suites.sh purchase-orders

make frontend-lookups
make frontend-products
make frontend-operations
```

## One-command full local checks runner
From the repository root:

```bash
npm run test:local:all
```

Equivalent direct script form:

```bash
./scripts/run-all-local-checks.sh
```

This orchestrates:
- backend full local CI-equivalent checks (`backend/test:ci:local`)
- frontend UI validation/test flow (`typecheck:products`, `typecheck`, `test:lookups`, `test:products`, `test:operations`)
- disposable PostgreSQL boot via Docker Compose for backend Prisma-backed suites

## Contributing
Please read:
- `CONTRIBUTING.md`

## Notes for contributors
- Use a **disposable test database only** for Prisma-backed e2e runs.
- `test:e2e:prisma:prepare` uses `prisma db push --force-reset`, which wipes the target test DB.
- Accounting is currently stubbed in the backend e2e setup so payment/credit flows can be tested without full accounting master setup.

## Related docs
- `backend/README.md`
- `backend/PRISMA_E2E_TESTING.md`
- `frontend/README.md`
- `frontend/PROTECTED_ADMIN_ROUTE_REGISTRATION.md`
- `frontend/PORTAL_STAFF_PROTECTED_ROUTE_PATTERNS.md`
- `dairy_distributor_erp_api_blueprint.md`
- `retailer_payment_credit_api_blueprint.md`
