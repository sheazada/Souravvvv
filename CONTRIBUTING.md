# Contributing to Dairy Distributor ERP

Thanks for contributing.

This project is a business-specific, enterprise-grade **Dairy Distributor ERP** for a **Sudha Dairy distributor**. Please keep contributions aligned with the actual domain needs:
- retailer/shop-centric workflows
- admin-assisted ordering and billing
- ledger-first finance behavior
- operational focus on daily demand consolidation, procurement, dispatch, delivery, and collections

---

## 1. Before you start

Please review these files first:
- `README.md`
- `backend/README.md`
- `backend/PRISMA_E2E_TESTING.md`
- `dairy_distributor_erp_requirements.md`
- `dairy_distributor_erp_api_blueprint.md`
- `retailer_payment_credit_api_blueprint.md`

If you are working on finance/collections/credit logic, also review:
- `retailer_payment_credit_management_module.md`
- `retailer_payment_credit_schema_additions.md`

---

## 2. Contribution principles

### Keep the ERP business-realistic
Do not simplify ERP behavior into a generic e-commerce or ordering app.

### Preserve assisted workflows
These must remain true:
- admin/salesperson can create order on behalf of retailer
- admin can generate invoice on behalf of retailer
- those records must still appear under the same retailer account in:
  - dashboard
  - orders
  - invoices
  - dues
  - ledger

### Prefer API-first changes
If you add a new business flow:
1. define/update API contract
2. align DTO/controller/service structure
3. wire frontend to that API

### Prefer searchable selectors over raw UUID entry
This is already a project direction. Preserve it.

### Maintain auditability
For finance, stock, dispatch, and overrides, favor explicit history and append-only behavior over silent mutation.

---

## 3. Local setup

### Prerequisites
- Node.js 20+
- npm
- PostgreSQL 16+ or Docker

### Repository areas
- `backend/` — NestJS + Prisma backend
- `frontend/` — Next.js frontend
- `prisma/` — shared Prisma schema and seed assets

---

## 4. Backend setup

From `backend/`:

```bash
npm ci
npm run prisma:generate
```

Application env references:
- `backend/.env.example`
- `backend/.env.test`
- `backend/.env.test.example`

### Standard backend checks
```bash
npm run lint
npm run build
```

---

## 5. Frontend setup

From `frontend/`:

```bash
npm install
npm run dev
```

Use:
- `frontend/.env.example`

### Optional root-level frontend helper
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

Useful aliases include:
- `lookups`
- `products`
- `operations`
- `dispatch`
- `inventory`
- `goods-receipts`
- `purchase-orders`

---

## 6. Running tests

## 6.1 Backend service/integration-style tests
From `backend/`:

```bash
npm run test:credit-control
npm run test:payments-integration
npm run test:credit-ops-integration
```

## 6.2 Mocked HTTP e2e tests
```bash
npm run test:e2e:http
```

## 6.3 Prisma-backed HTTP e2e tests
These run against a real disposable PostgreSQL database.

### Prepare a disposable test DB
Preferred option from the repository root:

```bash
docker compose up -d dairy-erp-test-db
```

Compose file:
- `docker-compose.yml`

Alternative one-off Docker command:

```bash
docker run --name dairy-erp-test-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=dairy_erp_test \
  -p 5432:5432 \
  -d postgres:16
```

### Load test env
From `backend/` on Linux/macOS:

```bash
set -a
source .env.test
set +a
```

### Prepare/reset schema
```bash
npm run test:e2e:prisma:prepare
```

### Run Prisma-backed suites
```bash
npm run test:e2e:prisma:http
```

Or individually:

```bash
npm run test:e2e:prisma:http-payments
npm run test:e2e:prisma:http-credit-ops
```

### One-command helper from repo root
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

You can also target a specific suite with friendly aliases:

```bash
./scripts/run-backend-prisma-suites.sh products
./scripts/run-backend-prisma-suites.sh lookups
./scripts/run-backend-prisma-suites.sh all
make backend-prisma-products
```

Raw npm script names still work too:

```bash
./scripts/run-backend-prisma-suites.sh test:e2e:prisma:http-products
```

### Important warning
`test:e2e:prisma:prepare` uses a **force reset** on the target DB.

Only use a **dedicated disposable test database**.

---

## 7. Full local CI-equivalent backend run

From `backend/`:

```bash
npm run test:ci:local
```

This is the preferred pre-PR backend validation command.

### Root-level all-in-one validation helper
From the repository root:

```bash
npm run test:local:all
```

Equivalent direct script form:

```bash
./scripts/run-all-local-checks.sh
```

This is useful when your changes span backend + frontend and you want one command to run the main local checks.

---

## 8. CI expectations

Backend CI currently checks:
- TypeScript compile
- Nest build
- service/integration tests
- mocked HTTP e2e tests
- Prisma-backed HTTP e2e tests

Frontend CI currently checks:
- product-scope frontend typecheck
- full frontend typecheck
- lookup tests
- product flow tests
- operations flow tests

Workflow files:
- `.github/workflows/backend-prisma-e2e.yml`
- `.github/workflows/frontend-ui-tests.yml`

If GitHub branch protection is configured with required status checks, the current check/job names to use are:
- `backend-tests`
- `frontend-ui-tests`

Before opening a PR, try to make sure your branch can pass the relevant local checks.

---

## 9. Working with Prisma

If you change database behavior:
- update `prisma/schema.prisma`
- regenerate Prisma client:
  ```bash
  cd backend
  npm run prisma:generate
  ```
- update seed/test fixtures if needed
- update Prisma-backed e2e fixtures if your new fields are required for route execution

When adding finance logic, be careful not to break:
- `RetailerCreditProfile`
- `RetailerPaymentMetric`
- `RetailerLedgerEntry`
- `RetailerPaymentIntent`
- `RetailerAdvanceWallet`
- `PaymentReceipt`
- `PaymentAllocation`

---

## 10. Backend coding guidance

### Prefer service orchestration over controller logic
Controllers should stay thin.

### Keep finance behavior explicit
For retailer finance:
- draft receipt should not silently behave like confirmed receipt
- confirmation should be the finance posting boundary
- ledger, wallet, allocations, and metrics should stay consistent

### Avoid silent business rule drift
If you change approval, dispatch, collection, or invoice logic, check whether it affects:
- credit enforcement
- ledger posting
- wallet posting
- retailer portal visibility

### Reuse existing module boundaries
Especially:
- `sales-orders`
- `sales-invoices`
- `payments`
- `delivery`
- `dispatch`
- `retailers`

---

## 11. Frontend coding guidance

### Keep mobile-first behavior
The UI is meant for daily operational use, including on phones.

### Respect role separation
- admin
- retailer portal
- staff/driver

### Keep API alignment clean
If backend response shape changes, update:
- feature API client
- type definitions
- consuming components

---

## 12. Label guidance

This repository uses GitHub labels to make bugs, regressions, features, CI work, and business-risk items easier to triage.

Primary references:
- `.github/LABELS.md`
- `.github/scripts/bootstrap-labels.sh`

### Minimum recommended labels for issues
Try to apply at least:
- one **type** label
  - `bug`
  - `enhancement`
  - `regression`
  - `docs`
  - `test`
  - `ci`
- one **priority** label
  - `P0-critical`
  - `P1-high`
  - `P2-medium`
  - `P3-low`
- one **area/domain** label
  - for example `area:backend`, `area:frontend`, `domain:payments`, `domain:inventory`

### When to use business risk labels
Use these when the issue or PR may affect trust, balances, or operational execution:
- `risk:finance`
- `risk:inventory`
- `risk:dispatch`
- `risk:retailer-visibility`
- `risk:data-integrity`

### Important examples
#### Wrong dues / ledger / wallet / payment state
Add:
- `risk:finance`
- usually also one or more of:
  - `domain:payments`
  - `domain:ledger`
  - `domain:credit-control`

#### Wrong stock / batch / GRN / stock movement behavior
Add:
- `risk:inventory`
- usually also:
  - `domain:grn`
  - `domain:inventory`

#### Assisted records missing from retailer account history
Add:
- `risk:retailer-visibility`
- usually also:
  - `domain:sales-orders`
  - `domain:sales-invoices`
  - `domain:retailer-portal`

### Workflow-state labels
Use when helpful:
- `needs-triage`
- `needs-repro`
- `blocked`
- `needs-business-decision`
- `ready-for-dev`
- `ready-for-review`

## 13. Pull request checklist

Before opening a PR, please verify:

- [ ] business behavior still matches ERP requirements
- [ ] assisted retailer workflows still work
- [ ] backend compiles
- [ ] relevant tests pass
- [ ] new DTOs/controllers/services are aligned
- [ ] frontend types updated if API changed
- [ ] no accidental hardcoded secrets
- [ ] disposable test DB only used for Prisma e2e
- [ ] docs updated if workflow/contracts changed

If your PR affects finance, mention explicitly whether it changes:
- credit check behavior
- order approval rules
- dispatch release rules
- invoice posting rules
- ledger posting
- wallet posting
- reminder behavior

---

## 14. Commit guidance

Use clear commit messages, for example:
- `backend: enforce credit policy on dispatch start`
- `payments: confirm receipt before ledger posting`
- `tests: add prisma-backed webhook e2e coverage`
- `frontend: align portal dues type with finance summary payload`

---

## 15. Issue templates — which one to use

When opening a GitHub issue, use the template that best matches the problem:

### Use `Bug report` when:
- something is broken right now
- behavior is incorrect but not clearly known to be a regression
- you need to report frontend/backend/API/CI defects

### Use `Business workflow regression` when:
- a core ERP workflow used to work and is now broken
- the issue affects operational trust or financial correctness
- you suspect retailer dues, ledger, wallet, stock, dispatch, or portal visibility may have regressed

### Use `Feature request` when:
- you are proposing a new capability
- you want to improve an existing workflow rather than report breakage
- the current system behavior is incomplete for a real business need

### Helpful references before filing
- `README.md`
- `backend/README.md`
- `frontend/README.md`
- `.github/ISSUE_TEMPLATE/config.yml`

## 16. Maintainer triage checklist
When a new issue or PR is opened, maintainers should quickly confirm:

- [ ] correct issue / PR template was used
- [ ] summary is understandable without extra digging
- [ ] affected workflow is identified
- [ ] affected role(s) are identified
- [ ] priority label is set
- [ ] area / domain label is set
- [ ] risk label is added if finance, inventory, dispatch, retailer visibility, or data integrity may be affected
- [ ] issue is marked `needs-triage`, `needs-repro`, `needs-business-decision`, or `ready-for-dev` as appropriate
- [ ] if merge-blocking CI is discussed, check names referenced are current:
  - `backend-tests`
  - `frontend-ui-tests`
- [ ] if regression is reported, capture last known good behavior / release if available
- [ ] if data integrity risk exists, ask for example records / IDs / payloads early
- [ ] if business rule is ambiguous, request business clarification before implementation starts

## 17. If you are unsure

When in doubt, prefer:
1. preserving existing ERP business behavior
2. adding tests before changing critical finance flows
3. documenting assumptions in the PR description

If a change affects multiple modules, mention the end-to-end business workflow in the PR, not just the code change.
