---
name: Bug report
about: Report a defect in backend, frontend, ERP workflow, data integrity, or CI
labels: bug
---

## Summary
Describe the bug clearly in 1–3 sentences.

## Severity
- [ ] blocker — business cannot operate / release should stop
- [ ] high — critical workflow broken or data risk present
- [ ] medium — workaround exists but business impact is real
- [ ] low — minor defect / cosmetic / edge case

## Area affected
- [ ] backend API
- [ ] frontend admin UI
- [ ] retailer portal
- [ ] staff / driver portal
- [ ] Prisma / schema / seed / fixtures
- [ ] CI / automated tests
- [ ] docs / developer workflow

## Business workflow affected
- [ ] assisted retailer ordering
- [ ] assisted retailer billing / invoice generation
- [ ] daily demand consolidation
- [ ] purchase order creation
- [ ] GRN / inward receipt
- [ ] inventory / stock adjustment / stock visibility
- [ ] dispatch trip planning / loading
- [ ] delivery stop execution
- [ ] payment receipt flow
- [ ] retailer ledger / dues / passbook
- [ ] advance wallet
- [ ] credit control / override / blocking
- [ ] reports / dashboard
- [ ] notifications

## Roles affected
- [ ] owner / admin
- [ ] accountant / operations
- [ ] sales staff
- [ ] driver / delivery staff
- [ ] retailer / shop user
- [ ] developer / CI only

## Reproduction steps
1. 
2. 
3. 

## Expected behavior
What should have happened?

## Actual behavior
What actually happened?

## Business impact
Explain the operational or financial impact in practical terms.
Examples:
- retailer unable to place order
- invoice generated with wrong amount
- stock not updated after GRN
- ledger / dues mismatch
- dispatch trip blocked incorrectly

## Environment
- App area / page / API route:
- Browser / device:
- Backend environment:
- Branch / commit / PR (if known):
- Date / time observed:

## Data context (if known)
Add IDs or business references if available.
- retailer code / shop name:
- sales order no:
- invoice no:
- payment receipt no:
- PO / GRN / dispatch trip no:
- product / SKU:

## Finance / data integrity checks
If this affects money, ledger, stock, or customer history, check all that apply:
- [ ] incorrect dues / outstanding
- [ ] incorrect invoice payment status
- [ ] incorrect ledger entry / passbook history
- [ ] incorrect wallet balance
- [ ] incorrect stock / batch / movement / adjustment result
- [ ] incorrect credit block / override behavior
- [ ] assisted admin-created order/invoice missing from retailer account history
- [ ] no data integrity issue observed yet

## CI / branch protection context (only if relevant)
If this bug is about failing checks or merge blocking, mention the check names involved:
- [ ] `backend-tests`
- [ ] `frontend-ui-tests`
- [ ] other / unknown

## Evidence
Add anything useful:
- screenshots
- screen recordings
- logs / stack traces
- request / response payloads
- database rows / sample records

## Regression check
- [ ] this worked before and is now broken
- [ ] not sure
- [ ] new flow, no previous baseline

If it is a regression, mention the last known good behavior / commit if known:

## Suggested labels for maintainers / triage
The template already defaults to `bug`. During triage, consider also adding:

### Priority
- [ ] `P0-critical`
- [ ] `P1-high`
- [ ] `P2-medium`
- [ ] `P3-low`

### Area / domain
- [ ] `area:backend`
- [ ] `area:frontend`
- [ ] `area:prisma`
- [ ] `area:ci`
- [ ] `domain:payments`
- [ ] `domain:ledger`
- [ ] `domain:credit-control`
- [ ] `domain:inventory`
- [ ] `domain:dispatch`
- [ ] `domain:sales-orders`
- [ ] `domain:sales-invoices`
- [ ] `domain:retailer-portal`
- [ ] `domain:staff-portal`

### Business risk
- [ ] `risk:finance`
- [ ] `risk:inventory`
- [ ] `risk:dispatch`
- [ ] `risk:retailer-visibility`
- [ ] `risk:data-integrity`

Reference:
- `.github/LABELS.md`

## Additional context
Anything else we should know?
