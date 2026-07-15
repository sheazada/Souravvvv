---
name: Business workflow regression
about: Report a regression in a core ERP workflow
labels: regression, high-priority
---

## Workflow regressed
- [ ] assisted retailer order creation
- [ ] assisted retailer invoice creation
- [ ] daily demand consolidation
- [ ] purchase order generation
- [ ] GRN to inventory update
- [ ] stock adjustment / movement visibility
- [ ] dispatch trip generation / loading / start
- [ ] delivery stop update
- [ ] payment intent to receipt flow
- [ ] retailer ledger posting / dues visibility
- [ ] advance wallet handling
- [ ] credit check / override / dispatch block
- [ ] retailer portal visibility
- [ ] staff / driver portal visibility
- [ ] reports / dashboard
- [ ] notifications / alerts

## Summary
Briefly describe what used to work and what is now broken.

## Previous expected behavior
What was the correct behavior before the regression?

## Current broken behavior
What is happening now?

## Why this is business-critical
Explain the operational, financial, compliance, or trust impact.

## Users / roles affected
- [ ] owner / admin
- [ ] accountant / operations
- [ ] sales staff
- [ ] driver / delivery staff
- [ ] retailer / shop user
- [ ] developers / CI only

## Reproduction steps
1. 
2. 
3. 

## Expected result now
What should the system still be doing?

## Actual result now
What result is the system producing instead?

## Business/data integrity risk
Check all that apply:
- [ ] may affect retailer dues / outstanding
- [ ] may affect invoice payment status
- [ ] may affect ledger accuracy / passbook history
- [ ] may affect wallet accuracy
- [ ] may affect stock / batches / inventory valuation
- [ ] may affect dispatch execution or delivery completion
- [ ] may affect retailer portal trust / visibility
- [ ] may affect approval / override controls
- [ ] may affect reporting accuracy
- [ ] no data integrity issue confirmed yet

## Data context (if known)
Add business references if available.
- retailer code / shop:
- sales order no:
- invoice no:
- payment receipt no:
- PO / GRN / trip / stop no:
- product / SKU:

## Regression source (if known)
- last known good commit / PR:
- first known bad commit / PR:
- release / deployment window:
- not known

## Evidence
Attach anything useful:
- screenshots
- logs / stack traces
- request / response payloads
- sample DB rows / records
- user complaint details

## CI / branch protection context (only if relevant)
If the regression surfaced through failing checks, mention the check names:
- [ ] `backend-tests`
- [ ] `frontend-ui-tests`
- [ ] other / unknown

## Related modules / files (if known)
List backend/frontend modules involved if known.

## Suggested labels for maintainers / triage
The template already defaults to `regression, high-priority`. During triage, consider also adding:

### Priority refinement
- [ ] `P0-critical`
- [ ] `P1-high`

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

### Business risk
- [ ] `risk:finance`
- [ ] `risk:inventory`
- [ ] `risk:dispatch`
- [ ] `risk:retailer-visibility`
- [ ] `risk:data-integrity`

Reference:
- `.github/LABELS.md`

## Additional notes
Anything else we should know?
