# Purchase Orders + GRN + Inventory Implementation Notes

## What was implemented

### Purchase Orders
- authenticated backoffice-only endpoints
- manual PO creation
- PO generation from approved/reviewed demand consolidation
- demand consolidation to PO linkage
- supplier validation
- PO totals calculation
- PO list, detail, items view
- PO update while mutable
- PO approve
- PO cancel with GRN protection
- receipt summary on PO detail

### Goods Receipt Notes (GRN)
- authenticated backoffice-only endpoints
- GRN creation against supplier or PO
- ordered vs received validation
- accepted + rejected = received validation
- batch number and expiry validation for tracked items
- GRN list and detail
- GRN update while mutable
- GRN approve
- GRN post
- ordered vs received comparison endpoint
- purchase order status sync after posting

### Inventory
- stock on hand aggregation
- inventory batches list/detail
- stock movement list/detail
- stock adjustment create/list/detail
- stock adjustment update while mutable
- stock adjustment approve
- stock adjustment post
- low stock alerts
- expiring stock alerts

## Core operational flow now supported

1. demand consolidation is created from approved sales orders
2. purchase order can be generated from consolidation
3. supplier goods are received into GRN
4. GRN is approved and posted
5. inventory batches and stock movements are created automatically
6. stock becomes visible in inventory reports

## Important business value
This directly supports your dairy distributor workflow:
- no manual procurement summary calculations
- PO linked to actual retailer demand
- supplier-delivered quantities compared with ordered quantities
- stock updated after receipt
- batch and expiry tracking supported

## Current implementation notes
- export/share endpoints are still payload-based, not external service integrations
- stock adjustment costing is minimal right now
- low stock threshold is currently simple (`<= 10`) and should later move to settings/product thresholds
- movement number and document number generation are count-based for now and should later become stronger sequence services

## Suggested next step
The best next implementation step is:
1. dispatch and loading workflow
2. delivery completion workflow
3. sales invoice generation
4. collections / payments
