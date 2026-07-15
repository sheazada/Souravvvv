# Repository Automation Helpers

This folder documents the small automation helpers used across the repository.

> Note: the actual helper scripts currently live in:
> - `.github/scripts/`
> - `backend/scripts/`
>
> This README is a single index for contributors.

---

## 1. GitHub label bootstrap

### Script
- `.github/scripts/bootstrap-labels.sh`

### Purpose
Creates or updates the recommended GitHub labels defined in:
- `.github/LABELS.md`

### Usage
From the repository root:

```bash
./.github/scripts/bootstrap-labels.sh
```

Explicit repo target:

```bash
./.github/scripts/bootstrap-labels.sh sheazada/DAIRY-FLOW-PRO
```

Or with env var:

```bash
REPO=sheazada/DAIRY-FLOW-PRO ./.github/scripts/bootstrap-labels.sh
```

### Requirements
- GitHub CLI (`gh`) installed
- `gh auth login` completed
- permission to manage labels on the target repo

---

## 2. Prisma-backed test database prepare/reset

### Script
- `backend/scripts/prepare-prisma-test-db.js`

### Purpose
Prepares the disposable PostgreSQL database used by Prisma-backed backend e2e tests.

It runs Prisma schema sync with force reset against:
- `TEST_DATABASE_URL`

### Usage
From `backend/`:

```bash
npm run test:e2e:prisma:prepare
```

### Requirements
- PostgreSQL test database available
- `TEST_DATABASE_URL` set

### Warning
This script uses a **force reset** and will wipe the target test database.

Use a **disposable test DB only**.

---

## 3. One-command Prisma-backed backend test runner

### Script
- `scripts/run-backend-prisma-suites.sh`

### Purpose
Boots the disposable PostgreSQL test DB via Docker Compose, loads `backend/.env.test`, prepares the Prisma test schema, and runs one or more Prisma-backed backend npm test scripts.

### Default usage
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

This defaults to:
- `cd backend && npm run test:e2e:prisma:http`

### Friendly aliases
The helper accepts these aliases:
- `all` → `test:e2e:prisma:http`
- `products` → `test:e2e:prisma:http-products`
- `lookups` → `test:e2e:prisma:http-lookups`
- `purchase-orders` → `test:e2e:prisma:http-purchase-orders`

Examples:
```bash
./scripts/run-backend-prisma-suites.sh all
./scripts/run-backend-prisma-suites.sh products
./scripts/run-backend-prisma-suites.sh lookups
./scripts/run-backend-prisma-suites.sh purchase-orders
```

### Run a specific Prisma-backed suite
You can still pass the raw npm script names directly:
```bash
./scripts/run-backend-prisma-suites.sh test:e2e:prisma:http-products
./scripts/run-backend-prisma-suites.sh test:e2e:prisma:http-lookups
./scripts/run-backend-prisma-suites.sh test:e2e:prisma:http-purchase-orders
```

### Run multiple suites in one call
You can mix aliases and raw script names:
```bash
./scripts/run-backend-prisma-suites.sh products lookups
./scripts/run-backend-prisma-suites.sh \
  products \
  test:e2e:prisma:http-payments
```

### Useful env toggles
- `SKIP_INSTALL=1` → skip `npm ci` if dependencies are already installed
- `HEALTH_RETRIES=60` → wait longer for Postgres health
- `HEALTH_SLEEP_SECONDS=2` → control health poll interval

Example:
```bash
SKIP_INSTALL=1 ./scripts/run-backend-prisma-suites.sh test:e2e:prisma:http-products
```

### Requirements
- Docker + Docker Compose available
- `docker-compose.yml` present at repo root
- Bash shell

---

## 4. One-command frontend UI runner

### Script
- `scripts/run-frontend-ui-suites.sh`

### Purpose
Runs the main frontend validation/test flow from the repository root.

### Default usage
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

This defaults to:
- `cd frontend && npm run typecheck:products`
- `cd frontend && npm run typecheck -- --pretty false`
- `cd frontend && npm run test:lookups`
- `cd frontend && npm run test:products`
- `cd frontend && npm run test:operations`

### Friendly aliases
The helper accepts these aliases:
- `all` → full frontend sequence
- `typecheck-products` → `typecheck:products`
- `typecheck` → full frontend typecheck
- `lookups` → `test:lookups`
- `products` → `test:products`
- `operations` → `test:operations`
- `dispatch` → dispatch frontend tests only
- `inventory` → inventory frontend tests only
- `goods-receipts` → goods receipt frontend tests only
- `purchase-orders` → purchase order frontend tests only

Examples:
```bash
./scripts/run-frontend-ui-suites.sh all
./scripts/run-frontend-ui-suites.sh typecheck-products
./scripts/run-frontend-ui-suites.sh lookups
./scripts/run-frontend-ui-suites.sh products
./scripts/run-frontend-ui-suites.sh operations
./scripts/run-frontend-ui-suites.sh dispatch
./scripts/run-frontend-ui-suites.sh inventory
./scripts/run-frontend-ui-suites.sh goods-receipts
./scripts/run-frontend-ui-suites.sh purchase-orders
```

### Useful env toggles
- `SKIP_INSTALL=1` → skip `npm ci` if dependencies are already installed

Example:
```bash
SKIP_INSTALL=1 ./scripts/run-frontend-ui-suites.sh lookups products
```

### Requirements
- Node.js + npm available
- Bash shell

---

## 5. One-command full local checks runner

### Script
- `scripts/run-all-local-checks.sh`

### Purpose
Runs the broad local validation flow from the repository root:
- backend full CI-equivalent checks
- frontend UI typechecks and test suites
- Docker Compose PostgreSQL boot for backend Prisma-backed test coverage

### Default usage
```bash
npm run test:local:all
```

Equivalent direct script form:

```bash
./scripts/run-all-local-checks.sh
```

### Useful env toggles
- `SKIP_INSTALL=1` → skip both backend and frontend `npm ci`
- `RUN_BACKEND=0` → run only frontend checks
- `RUN_FRONTEND=0` → run only backend checks
- `HEALTH_RETRIES=60` → wait longer for Postgres health
- `HEALTH_SLEEP_SECONDS=2` → control health poll interval

Examples:
```bash
SKIP_INSTALL=1 ./scripts/run-all-local-checks.sh
RUN_BACKEND=0 ./scripts/run-all-local-checks.sh
RUN_FRONTEND=0 ./scripts/run-all-local-checks.sh
```

### Requirements
- Docker + Docker Compose available (when backend checks run)
- Node.js + npm available
- Bash shell

---

## 6. Docker Compose test database

### File
- `docker-compose.yml`

### Purpose
Provides a ready-to-run local PostgreSQL 16 instance for Prisma-backed backend e2e testing.

### Usage
From the repository root:

```bash
docker compose up -d dairy-erp-test-db
```

Stop the service:

```bash
docker compose down
```

Stop and remove the persisted volume:

```bash
docker compose down -v
```

### Related docs
- `README.md`
- `backend/README.md`
- `backend/PRISMA_E2E_TESTING.md`
- `.github/LABELS.md`
- `CONTRIBUTING.md`
