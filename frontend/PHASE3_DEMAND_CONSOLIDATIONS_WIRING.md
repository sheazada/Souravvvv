# Frontend API Wiring — Phase 3 (Demand Consolidations)

## Implemented frontend flow

### Demand consolidation list page
- Uses `GET /demand-consolidations`
- Supports:
  - search
  - status filter
  - date filter
- Displays:
  - consolidation number
  - delivery cycle
  - status
  - consolidation date
  - notes
- Includes actions:
  - open detail
  - approve
  - rebuild
  - generate WhatsApp text

### Demand consolidation create flow
- Uses `POST /demand-consolidations`
- Supports:
  - delivery cycle ID
  - notes
  - default status inclusion of approved orders

### Demand consolidation detail page
- Uses:
  - `GET /demand-consolidations/:id`
  - `GET /demand-consolidations/:id/source-orders`
  - `GET /demand-consolidations/:id/summary/route-wise`
  - `GET /demand-consolidations/:id/summary/area-wise`
  - `PATCH /demand-consolidations/:id/items/:itemId`
  - `POST /demand-consolidations/:id/approve`
  - `POST /demand-consolidations/:id/rebuild`
  - `POST /demand-consolidations/:id/share/whatsapp`

### Detail page sections
- consolidation KPIs
- cycle and status summary
- editable product-wise demand table
- route-wise summary
- area-wise summary
- source orders table
- WhatsApp text preview

## Important business support
This is one of the most important workflows in your ERP because it turns many retailer orders into one procurement-ready demand sheet.
The frontend now reflects that exact business process.

## Current note
The create form still accepts manual delivery cycle UUID entry for now.
Once delivery cycle pages are wired on frontend, this should become a searchable cycle selector.

## Recommended next frontend wiring
1. purchase order list/detail
2. GRN list/detail
3. inventory stock and batch pages
4. dispatch trip pages
