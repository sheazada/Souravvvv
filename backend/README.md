# Backend — Dairy Distributor ERP

[![Backend CI + Prisma E2E](https://github.com/sheazada/DAIRY-FLOW-PRO/actions/workflows/backend-prisma-e2e.yml/badge.svg)](https://github.com/sheazada/DAIRY-FLOW-PRO/actions/workflows/backend-prisma-e2e.yml)

NestJS + Prisma backend for the Dairy Distributor ERP.

## CI workflow
The backend CI workflow is defined in:

- `.github/workflows/backend-prisma-e2e.yml`

It runs:
- TypeScript compile check
- Nest build
- service/integration tests
- mocked HTTP e2e tests
- Prisma-backed HTTP e2e tests

## Test profiles
### Application env
- `backend/.env.example`

### CI/local disposable test env
- `backend/.env.test`
- `backend/.env.test.example`

The Prisma-backed e2e suite expects:
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

## Local CI-equivalent run
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

This helper will:
- start the disposable Postgres test DB via Docker Compose
- load `backend/.env.test`
- run `npm ci` (unless `SKIP_INSTALL=1`)
- run `npm run prisma:generate`
- run `npm run test:e2e:prisma:prepare`
- run `npm run test:e2e:prisma:http`

Run a specific suite instead with friendly aliases:

```bash
./scripts/run-backend-prisma-suites.sh products
./scripts/run-backend-prisma-suites.sh lookups
./scripts/run-backend-prisma-suites.sh purchase-orders
./scripts/run-backend-prisma-suites.sh all

npm run test:backend:prisma:purchase-orders

make backend-prisma-purchase-orders
```

Raw npm script names still work too:

```bash
./scripts/run-backend-prisma-suites.sh test:e2e:prisma:http-products
./scripts/run-backend-prisma-suites.sh test:e2e:prisma:http-lookups
./scripts/run-backend-prisma-suites.sh test:e2e:prisma:http-purchase-orders
```

## Prisma local run troubleshooting

### `TEST_DATABASE_URL` is missing
Symptom:
- Prisma-backed test commands fail immediately asking for `TEST_DATABASE_URL`

Fix:
```bash
cd backend
set -a
source .env.test
set +a
```

### Database connection refused on `localhost:5432`
Symptom:
- `prisma db push`
- `test:e2e:prisma:prepare`
- Prisma-backed e2e suites
fail with connection errors

Fix:
- start the disposable DB:
```bash
docker compose up -d dairy-erp-test-db
```
- then verify the container is healthy:
```bash
docker compose ps
```

### Wrong database / dangerous reset risk
Symptom:
- you are unsure whether the target DB is disposable

Fix:
- confirm `backend/.env.test` points to the dedicated test DB only
- do **not** run Prisma-backed prepare/reset commands against a shared or production-like database
- `npm run test:e2e:prisma:prepare` uses `prisma db push --force-reset`

### Prisma client seems out of date after schema changes
Symptom:
- type errors mention missing Prisma fields/relations
- runtime behavior does not reflect recent schema updates

Fix:
```bash
cd backend
npm run prisma:generate
```

If needed, reinstall dependencies first:
```bash
npm ci
npm run prisma:generate
```

### Test DB schema is stale / corrupted
Symptom:
- Prisma-backed tests fail after schema or fixture changes

Fix:
```bash
cd backend
npm run test:e2e:prisma:prepare
```

Then rerun the target suite:
```bash
npm run test:e2e:prisma:http-products
npm run test:e2e:prisma:http-lookups
npm run test:e2e:prisma:http-purchase-orders
npm run test:e2e:prisma:http
```

### `prisma`, `tsx`, `ts-node`, or `nest` command not found
Symptom:
- local environment lost dependencies
- sandbox/container was reset

Fix:
```bash
cd backend
npm ci
npm run prisma:generate
```

### Port `5432` already in use
Symptom:
- Docker Compose fails to start Postgres

Fix options:
- stop the existing local Postgres using port `5432`
- or change the published port in `docker-compose.yml` and update `TEST_DATABASE_URL` / `.env.test` to match

### Minimal Prisma-backed validation sequence
If you only want to confirm the real-DB suites quickly:
```bash
cd backend
npm ci
npm run prisma:generate
set -a
source .env.test
set +a
npm run test:e2e:prisma:prepare
npm run test:e2e:prisma:http-products
npm run test:e2e:prisma:http-lookups
```

## Useful targeted commands
### Service/integration tests
```bash
npm run test:credit-control
npm run test:products-service
npm run test:payments-integration
npm run test:credit-ops-integration
npm run test:retailer-notes
npm run test:sales-invoice-revision
```

### Mocked HTTP e2e tests
```bash
npm run test:e2e:http
```

Includes retailer note HTTP flows via:
```bash
npm run test:e2e:http-retailer-notes
```

### Prisma-backed HTTP e2e tests
```bash
npm run test:e2e:prisma:http
```

### Individual Prisma-backed suites
```bash
npm run test:e2e:prisma:http-payments
npm run test:e2e:prisma:http-credit-ops
npm run test:e2e:prisma:http-sales-invoice-revision
npm run test:e2e:prisma:http-retailer-notes
```

## Notes for contributors
- Use a **disposable test database only** for Prisma-backed e2e runs.
- `test:e2e:prisma:prepare` uses `prisma db push --force-reset`, which wipes the target test DB.
- Accounting is stubbed in the current e2e setup so finance/payment/credit flows can be validated without full accounting master setup.

## Related docs
- `backend/PRISMA_E2E_TESTING.md`
- `backend/NESTJS_MODULE_STRUCTURE.md`
- `backend/PAYMENTS_ACCOUNTING_IMPLEMENTATION.md`
