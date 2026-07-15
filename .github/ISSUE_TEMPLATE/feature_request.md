---
name: Feature request
about: Suggest a new ERP feature or enhancement
labels: enhancement
---

## Summary
Describe the feature or enhancement clearly in 1–3 sentences.

## Problem to solve
What business, operational, reporting, finance, or workflow problem does this address?

## Requested outcome
What should users be able to do after this feature is implemented?

## Business workflow area
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
- [ ] retailer portal
- [ ] staff / driver portal
- [ ] reports / dashboard
- [ ] notifications
- [ ] CI / testing / developer workflow

## Users / roles affected
- [ ] owner / admin
- [ ] accountant / operations
- [ ] sales staff
- [ ] driver / delivery staff
- [ ] retailer / shop user
- [ ] developers only

## Current workaround
If users are handling this manually today, describe the current workaround.

## Proposed behavior
Describe the desired behavior in practical business terms.

## Example workflow
1. 
2. 
3. 

## Business value / priority
Why is this important?
- [ ] critical
- [ ] high
- [ ] medium
- [ ] low

Explain the value:
- saves time
- reduces finance risk
- reduces stock mismatch
- improves retailer trust
- improves dispatch execution
- improves reporting visibility
- other:

## Data / finance / audit impact
Check anything you expect this to affect:
- [ ] retailer dues / outstanding
- [ ] invoice balances
- [ ] ledger posting / passbook
- [ ] wallet behavior
- [ ] stock / inventory batches
- [ ] dispatch execution
- [ ] approvals / overrides
- [ ] notifications
- [ ] audit trail / history
- [ ] no data impact expected

## API / backend impact
If known, describe expected backend/API changes.
Examples:
- new endpoint
- new filters
- new status transition
- validation change
- background job

## Frontend / UX impact
If known, describe expected UI/UX changes.
Examples:
- new page
- new action button
- new tab / detail section
- new dashboard/report widget
- selector / form change

## Prisma / schema impact
- [ ] no schema change expected
- [ ] likely schema change expected
- [ ] seed / fixture update likely needed
- [ ] unknown

## Reporting / CI / docs impact
- [ ] reporting changes expected
- [ ] automated test coverage expected
- [ ] CI workflow update may be needed
- [ ] docs should be updated

## Related references
Link related issues, PRs, docs, or business notes if available.

## Suggested labels for maintainers / triage
The template already defaults to `enhancement`. During triage, consider also adding:

### Priority
- [ ] `P1-high`
- [ ] `P2-medium`
- [ ] `P3-low`

### Area / domain
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
- [ ] `domain:reports`
- [ ] `domain:dashboard`
- [ ] `domain:notifications`

### Workflow / triage state
- [ ] `needs-triage`
- [ ] `needs-business-decision`
- [ ] `ready-for-dev`

Reference:
- `.github/LABELS.md`

## Additional notes
Anything else we should know?
