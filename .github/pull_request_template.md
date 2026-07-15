## Summary
Briefly describe what this PR changes.

## Change scope
Select the main implementation scope.

- [ ] backend-only
- [ ] frontend-only
- [ ] full-stack
- [ ] Prisma/schema-focused
- [ ] CI/docs/dev-workflow only

## Business workflow affected
Select all that apply and explain the business impact.

- [ ] assisted retailer ordering
- [ ] assisted retailer billing / invoice generation
- [ ] daily demand consolidation
- [ ] purchase / GRN / inventory
- [ ] dispatch / delivery
- [ ] payment receipt flow
- [ ] retailer ledger / passbook
- [ ] advance wallet
- [ ] credit control / overrides
- [ ] retailer portal
- [ ] staff portal
- [ ] reports / dashboard
- [ ] notifications
- [ ] CI / testing / developer workflow

## Roles affected
- [ ] owner / admin
- [ ] accountant / operations
- [ ] sales staff
- [ ] driver / delivery staff
- [ ] retailer / shop user
- [ ] developers only

## What changed
- [ ] backend logic
- [ ] frontend UI
- [ ] Prisma schema
- [ ] test coverage
- [ ] docs
- [ ] CI workflow

## Suggested PR labels
If you apply labels manually, prefer a lightweight set that communicates:

### Type (pick at least one)
- [ ] `bug`
- [ ] `enhancement`
- [ ] `regression`
- [ ] `docs`
- [ ] `test`
- [ ] `ci`
- [ ] `refactor`

### Area / domain (pick one or more if useful)
- [ ] `area:backend`
- [ ] `area:frontend`
- [ ] `area:prisma`
- [ ] `area:ci`
- [ ] `domain:sales-orders`
- [ ] `domain:sales-invoices`
- [ ] `domain:payments`
- [ ] `domain:ledger`
- [ ] `domain:credit-control`
- [ ] `domain:inventory`
- [ ] `domain:dispatch`
- [ ] `domain:retailer-portal`
- [ ] `domain:staff-portal`

### Priority / risk (add if relevant)
- [ ] `P0-critical`
- [ ] `P1-high`
- [ ] `P2-medium`
- [ ] `P3-low`
- [ ] `risk:finance`
- [ ] `risk:inventory`
- [ ] `risk:dispatch`
- [ ] `risk:retailer-visibility`
- [ ] `risk:data-integrity`

Reference:
- `.github/LABELS.md`

## Key implementation notes
Describe the important design / behavior changes.

## Finance / credit checklist
If this PR touches finance, collections, invoices, wallet, or credit rules, confirm each item.

- [ ] draft vs confirmed receipt behavior is preserved
- [ ] ledger-first behavior is preserved
- [ ] retailer financial history remains under one retailer account
- [ ] assisted admin-created order/invoice still appears in retailer dashboard/history/dues/ledger
- [ ] wallet behavior reviewed if unallocated receipt amount can change
- [ ] credit-check / override behavior reviewed if order, invoice, or dispatch logic changed

## Database / Prisma changes
- [ ] no schema change
- [ ] schema changed
- [ ] prisma client regeneration required
- [ ] seed / fixture update required

If schema changed, describe the impact:

## API changes
List any new or changed endpoints / response shape changes.

## Frontend impact
List pages, feature modules, components, hooks, or types affected.

## Validation expectations by scope
Check all that apply.

### Backend validation expected
- [ ] backend not touched
- [ ] backend touched and `cd backend && npm run lint` was run
- [ ] backend touched and `cd backend && npm run build` was run
- [ ] backend touched and relevant backend tests were run

### Frontend validation expected
- [ ] frontend not touched
- [ ] frontend touched and `cd frontend && npm run typecheck:products` was run
- [ ] frontend touched and `cd frontend && npm run typecheck -- --pretty false` was run
- [ ] frontend touched and relevant frontend test suites were run

### If frontend changed, which test groups were relevant?
- [ ] `test:lookups`
- [ ] `test:products`
- [ ] `test:operations`
- [ ] frontend change had no automated test target yet

### If backend changed, which backend suites were relevant?
- [ ] `test:products-service`
- [ ] `test:credit-control`
- [ ] `test:payments-integration`
- [ ] `test:credit-ops-integration`
- [ ] `test:retailer-notes`
- [ ] `test:sales-invoice-revision`
- [ ] `test:e2e:http`
- [ ] `test:e2e:prisma:http`
- [ ] backend change had no automated test target yet

## CI / required checks impact
Check all that apply.

- [ ] no CI impact
- [ ] backend required check impacted: `backend-tests`
- [ ] frontend required check impacted: `frontend-ui-tests`
- [ ] workflow file updated
- [ ] docs updated to match workflow/check naming

## Tests run
Check all that you ran locally.

### Backend
- [ ] `cd backend && npm run lint`
- [ ] `cd backend && npm run build`
- [ ] `cd backend && npm run test:credit-control`
- [ ] `cd backend && npm run test:products-service`
- [ ] `cd backend && npm run test:payments-integration`
- [ ] `cd backend && npm run test:credit-ops-integration`
- [ ] `cd backend && npm run test:retailer-notes`
- [ ] `cd backend && npm run test:sales-invoice-revision`
- [ ] `cd backend && npm run test:e2e:http`
- [ ] `cd backend && npm run test:e2e:prisma:http`

### Frontend
- [ ] `cd frontend && npm run typecheck:products`
- [ ] `cd frontend && npm run typecheck -- --pretty false`
- [ ] `cd frontend && npm run test:lookups`
- [ ] `cd frontend && npm run test:products`
- [ ] `cd frontend && npm run test:operations`

### Other
- [ ] not run locally

## If something relevant was not run
Explain why a relevant validation step was skipped.

## Prisma-backed e2e note
If Prisma-backed backend tests were run:
- [ ] used disposable test DB only
- [ ] `TEST_DATABASE_URL` configured
- [ ] DB reset impact understood

## Screenshots / sample payloads
Add screenshots, logs, or request/response examples if helpful.

## Risks / follow-up
List any known risks, limitations, or follow-up work.

---

## Maintainer label reminder
Before merging, make sure the PR has a sensible label set where relevant:

- one **type** label
  - e.g. `bug`, `enhancement`, `regression`, `docs`, `test`, `ci`, `refactor`
- one **priority** label when useful
  - e.g. `P0-critical`, `P1-high`, `P2-medium`, `P3-low`
- one or more **area/domain** labels
  - e.g. `area:backend`, `area:frontend`, `domain:payments`, `domain:inventory`, `domain:dispatch`
- one or more **risk** labels if business/data integrity is involved
  - e.g. `risk:finance`, `risk:inventory`, `risk:dispatch`, `risk:retailer-visibility`, `risk:data-integrity`

Reference:
- `.github/LABELS.md`
