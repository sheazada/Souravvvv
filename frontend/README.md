# Dairy Distributor ERP Frontend

[![Frontend UI Tests](https://github.com/sheazada/DAIRY-FLOW-PRO/actions/workflows/frontend-ui-tests.yml/badge.svg)](https://github.com/sheazada/DAIRY-FLOW-PRO/actions/workflows/frontend-ui-tests.yml)

This folder contains the **Next.js App Router frontend architecture** for the Dairy Distributor ERP.

## Main goals
- mobile-first responsive UI
- role-based route groups
- admin / retailer / staff experiences
- clean API integration with the NestJS backend

## Run later
```bash
npm install
npm run dev
```

## Frontend tests
```bash
npm run test:lookups
npm run test:products
npm run test:operations
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

Feature grouping:
- `test:lookups` → lookup option + lookup input coverage
- `test:products` → product management + product detail flows
- `test:operations` → goods receipts, purchase orders, dispatch trips, and inventory flows

## CI workflow
Frontend UI tests are wired in:
- `.github/workflows/frontend-ui-tests.yml`

Current frontend CI runs:
- `npm run typecheck:products` (product-scope typecheck)
- `npm run typecheck -- --pretty false` (full frontend typecheck)
- `npm run test:lookups`
- `npm run test:products`
- `npm run test:operations`

If GitHub branch protection uses required status checks, the current frontend check/job name is:
- `frontend-ui-tests`

## Environment
Copy `.env.example` to `.env.local` and update the API URL.

## Frontend developer docs
- `PROTECTED_ADMIN_ROUTE_REGISTRATION.md` — how to register a new protected admin route/section with centralized permissions, nav wiring, route guards, and page metadata.
- `PORTAL_STAFF_PROTECTED_ROUTE_PATTERNS.md` — patterns for retailer portal and staff/driver protected routes, route groups, auth middleware, and `/my/*` scoped API usage.
