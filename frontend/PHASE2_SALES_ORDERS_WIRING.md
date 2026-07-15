# Frontend API Wiring — Phase 2 (Sales Orders)

## Implemented frontend flow

### Sales order list page
- Uses `GET /sales-orders`
- Supports:
  - search
  - status filter
  - source filter
- Displays:
  - order number
  - retailer
  - source
  - status
  - delivery cycle
  - total
- Includes quick actions:
  - approve pending order
  - cancel active order

### Assisted order create flow
- Uses `POST /sales-orders/assisted`
- Retailer select is loaded from `GET /retailers`
- Product hint suggestions are loaded from `GET /dashboard/charts/top-products`
- Supports multiple line items
- Supports:
  - retailer
  - source (admin/salesperson)
  - requested delivery date
  - notes
  - variantId + qty + remarks rows

### Additional order actions wired
- `POST /sales-orders/:id/approve`
- `POST /sales-orders/:id/cancel`

## Important business support
This frontend implementation supports your real business behavior:
- admin can create order for retailer
- salesperson can also create order for retailer
- retailer-linked orders still remain in the same account context
- office-assisted ordering is now represented in the UI flow

## Current note
The assisted form currently uses:
- retailer selection from live API
- product hints from dashboard top products
- manual variant ID entry when needed

Once product catalog APIs are fully wired, variant selection can be upgraded to a richer searchable selector.

## Recommended next frontend wiring
1. sales order detail page
2. demand consolidation list/detail page
3. purchase order + GRN + inventory pages
4. dispatch + delivery pages
