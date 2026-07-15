# Frontend API Wiring — Phase 4 (Purchase Orders + GRN + Inventory)

## Implemented frontend flows

### Purchase Orders
- purchase order list page uses:
  - `GET /purchase-orders`
- manual purchase order create uses:
  - `POST /purchase-orders`
- demand-based PO generation uses:
  - `POST /purchase-orders/from-demand-consolidation`
- PO detail page uses:
  - `GET /purchase-orders/:id`
- actions wired:
  - `POST /purchase-orders/:id/approve`
  - `POST /purchase-orders/:id/cancel`

### Goods Receipts (GRN)
- GRN list page uses:
  - `GET /goods-receipts`
- GRN create uses:
  - `POST /goods-receipts`
- GRN detail uses:
  - `GET /goods-receipts/:id`
  - `GET /goods-receipts/:id/comparison`
- actions wired:
  - `POST /goods-receipts/:id/approve`
  - `POST /goods-receipts/:id/post`

### Inventory
- stock on hand page uses:
  - `GET /inventory/stock-on-hand`
- batches page uses:
  - `GET /inventory/batches`
- stock movements page uses:
  - `GET /inventory/stock-movements`
- stock adjustments page uses:
  - `GET /stock-adjustments`
  - `POST /stock-adjustments`
  - `POST /stock-adjustments/:id/approve`
  - `POST /stock-adjustments/:id/post`

## UI coverage added
- purchase order list + quick actions
- PO detail with receipt summary
- demand-to-PO generation form
- manual PO form
- GRN list + create form
- GRN detail with ordered vs received comparison
- stock on hand table
- inventory batches table
- stock movements table
- stock adjustments list + create form

## Important business support
This frontend phase supports the main procurement and stock flow:

1. approved demand consolidation
2. purchase order generation
3. supplier goods receipt entry
4. quantity comparison
5. inventory visibility
6. stock correction via adjustments

## Current implementation notes
- supplier, warehouse, batch, and variant selectors still use UUID/manual-entry style fields for now in some forms
- top product hints are reused to help variant entry in procurement and GRN forms
- as master-data screens get wired further, these fields should become searchable selectors instead of raw UUID inputs

## Recommended next frontend wiring
1. dispatch trip pages
2. delivery stop pages
3. sales invoice pages
4. payments pages
