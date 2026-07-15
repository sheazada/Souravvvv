# Frontend API Wiring — Phase 5 (Dispatch + Delivery + Sales Invoices)

## Implemented frontend flows

### Dispatch trips
- dispatch trip list page uses:
  - `GET /dispatch-trips`
- dispatch trip generation uses:
  - `POST /dispatch-trips/generate`
- dispatch trip detail uses:
  - `GET /dispatch-trips/:id`
  - `GET /dispatch-trips/:id/loading-sheet`
  - `GET /dispatch-trips/:id/challan`
- actions wired:
  - `POST /dispatch-trips/:id/assign-resources`
  - `POST /dispatch-trips/:id/loading-sheet/generate`
  - `POST /dispatch-trips/:id/challan/generate`
  - `POST /dispatch-trips/:id/start`
  - `POST /dispatch-trips/:id/complete`

### Delivery stop detail
- delivery stop detail page uses:
  - `GET /delivery-stops/:id`
- delivery status update uses:
  - `POST /delivery-stops/:id/status`
- collection entry uses:
  - `POST /delivery-stops/:id/collections`
- crate entry uses:
  - `POST /delivery-stops/:id/crates`
- proof of delivery uses:
  - `POST /delivery-stops/:id/proof-of-delivery`

### Sales invoices
- sales invoice list page uses:
  - `GET /sales-invoices`
- delivery invoice generation uses:
  - `POST /sales-invoices/generate`
- assisted invoice generation uses:
  - `POST /sales-invoices/assisted`
- sales invoice detail uses:
  - `GET /sales-invoices/:id`
- actions wired:
  - `POST /sales-invoices/:id/post`
  - `POST /sales-invoices/:id/cancel`
  - `POST /sales-invoices/:id/share/whatsapp`

## UI coverage added
- dispatch trip list with generate/start/complete actions
- dispatch trip detail with loading sheet and challan sections
- delivery stop detail with status, collection, crate, and POD sections
- sales invoice list with auto and assisted generation forms
- sales invoice detail with allocations and WhatsApp preview

## Important business support
This phase supports your final operations chain:
1. dispatch trip is created
2. loading sheet allocates stock
3. delivery stop is completed
4. collection can be recorded
5. invoice is generated for the retailer
6. assisted office billing remains supported for retailers who do not self-manage invoices

## Current implementation notes
- many forms still use UUID/manual inputs for route, cycle, vehicle, order, and trip references
- these should later become searchable selectors backed by master-data endpoints
- staff portal wiring can later reuse these same APIs with role-based UI restrictions

## Recommended next frontend wiring
1. payments pages
2. accounting pages
3. reports pages
4. retailer portal pages
5. staff portal pages
