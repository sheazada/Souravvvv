# Searchable Selectors Across UUID-Based Forms

## What was implemented

### Reusable selector components
- `frontend/src/components/ui/searchable-select.tsx`
  - enhanced to allow custom values when needed
- `frontend/src/components/ui/lookup-input.tsx`
  - generic lookup-backed selector using live backend data

### Backend lookup API
A new lookup module was added so frontend forms can load searchable options instead of relying on manual UUID entry.

#### Backend files added
- `backend/src/core/lookups/dto/query-lookup.dto.ts`
- `backend/src/core/lookups/dto/index.ts`
- `backend/src/core/lookups/lookups.service.ts`
- `backend/src/core/lookups/lookups.controller.ts`
- `backend/src/core/lookups/lookups.module.ts`
- `backend/src/app.module.ts` updated

#### Lookup endpoints added
- `/lookups/retailers`
- `/lookups/suppliers`
- `/lookups/routes`
- `/lookups/delivery-cycles`
- `/lookups/vehicles`
- `/lookups/employees`
- `/lookups/warehouses`
- `/lookups/product-variants`
- `/lookups/demand-consolidations`
- `/lookups/sales-orders`
- `/lookups/dispatch-trips`
- `/lookups/sales-invoices`
- `/lookups/purchase-orders`
- `/lookups/purchase-order-items`
- `/lookups/purchase-invoices`
- `/lookups/inventory-batches`
- `/lookups/crate-types`
- `/lookups/bank-accounts`
- `/lookups/cash-registers`

### Frontend lookup layer
#### Files added
- `frontend/src/types/lookups.ts`
- `frontend/src/features/lookups/api.ts`
- `frontend/src/features/lookups/options.ts`

## Forms upgraded to searchable selectors

### Sales Orders
- assisted order retailer selector
- assisted order product variant selector

### Demand Consolidations
- delivery cycle selector in create form

### Purchase Orders
- supplier selector
- approved demand consolidation selector
- manual PO variant selector

### Goods Receipts / GRN
- supplier selector
- purchase order selector
- purchase order item selector
- warehouse selector
- product variant selector

### Inventory Adjustments
- warehouse selector
- product variant selector
- optional batch selector

### Dispatch Trips
- delivery cycle selector
- route selector
- vehicle selector
- driver selector
- helper/staff selector
- trip resource reassignment selectors

### Sales Invoices
- retailer selector
- sales order selector
- dispatch trip selector
- assisted invoice reference selectors

### Payments
- retailer/supplier party selector
- cash register selector
- bank account selector
- dispatch trip selector
- sales invoice allocation selector
- purchase invoice allocation selector

### Delivery / Staff
- crate type selector in admin stop page
- crate type selector in staff stop page

### Inventory filters upgraded
- stock on hand filter selectors
- batch filter selectors
- movement filter selectors

## Important behavior
- selectors use live backend data where available
- selectors allow custom values as fallback if lookup data is missing or incomplete
- this removes the need to paste raw UUIDs in almost all everyday workflows
- the remaining UUID references are now mostly explanatory text or optional fallback behavior, not primary data-entry UX

## Recommended next step
1. replace remaining manual reference inputs if any
2. add richer dependent selectors (for example supplier -> PO items)
3. add async server-side search for very large datasets
4. continue mobile UX polish and offline/PWA work
