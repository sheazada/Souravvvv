# Frontend API Wiring — Phase 6 (Payments + Accounting)

## Implemented frontend flows

### Payments
- payment receipt list page uses:
  - `GET /payment-receipts`
- payment receipt create uses:
  - `POST /payment-receipts`
- payment receipt detail uses:
  - `GET /payment-receipts/:id`
  - `GET /payment-receipts/:id/allocations`
- receipt actions wired:
  - `POST /payment-receipts/:id/confirm`
  - `POST /payment-receipts/:id/cancel`
- allocation create uses:
  - `POST /payment-receipts/:id/allocations`
- outstanding views wired:
  - `GET /outstanding/retailers`
  - `GET /outstanding/suppliers`
  - `GET /outstanding/aging`

### Accounting
- accounts page uses:
  - `GET /accounts`
  - `GET /finance/trial-balance`
  - `GET /finance/profit-loss`
  - `GET /finance/balance-sheet`
- journal list page uses:
  - `GET /journal-entries`
  - `GET /ledger/customers`
  - `GET /ledger/suppliers`
- journal detail page uses:
  - `GET /journal-entries/:id`

## UI coverage added
- payment receipt list with filters
- payment receipt create form
- payment receipt detail with allocations
- confirm/cancel payment actions
- outstanding KPI cards
- accounts list with finance summary cards
- journal entry list
- customer/supplier ledger summary cards
- journal detail lines table
- finance settings page for retailer note thresholds
- threshold cache debug panel with admin reset action

## Important business support
This phase supports the finance visibility chain:
1. invoice generated
2. payment receipt created
3. payment confirmed
4. allocations linked to invoices
5. outstanding updates become visible
6. accounting journal views become available in frontend

## Current implementation notes
- payment, party, bank, cash register, and invoice references still use manual UUID inputs in forms for now
- these should later become searchable selectors backed by retailer/supplier/invoice master lookups
- accounting pages focus on visibility and validation of backend postings rather than manual journal creation

## Recommended next frontend wiring
1. reports pages
2. retailer portal invoice/order/dues pages
3. staff portal trip/stop pages
4. notification center UI
