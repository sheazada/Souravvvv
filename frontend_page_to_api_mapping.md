# Dairy Distributor ERP — Frontend Page to API Mapping

## 1. Purpose
This document maps the **frontend pages/screens** of the Dairy Distributor ERP to the **backend APIs** already designed and implemented.

It is intended for:
- web frontend planning
- mobile-first PWA planning
- React / Next.js page structure
- API integration sequencing

---

## 2. Frontend App Areas
The app should be divided into 4 main frontend areas:

1. **Auth**
2. **Admin / Backoffice**
3. **Retailer Portal**
4. **Driver / Staff Portal**

---

## 3. Global Frontend Conventions

## 3.1 Suggested frontend route structure

### Auth
- `/login`
- `/otp-login`
- `/forgot-password`
- `/reset-password`

### Admin / Backoffice
- `/app/dashboard`
- `/app/retailers`
- `/app/retailers/:id`
- `/app/products`
- `/app/sales-orders`
- `/app/sales-orders/:id`
- `/app/demand-consolidations`
- `/app/demand-consolidations/:id`
- `/app/purchase-orders`
- `/app/purchase-orders/:id`
- `/app/goods-receipts`
- `/app/goods-receipts/:id`
- `/app/inventory/stock`
- `/app/inventory/batches`
- `/app/inventory/movements`
- `/app/inventory/adjustments`
- `/app/dispatch-trips`
- `/app/dispatch-trips/:id`
- `/app/delivery-stops/:id`
- `/app/sales-invoices`
- `/app/sales-invoices/:id`
- `/app/payments`
- `/app/payments/:id`
- `/app/accounting/accounts`
- `/app/accounting/journals`
- `/app/accounting/journals/:id`
- `/app/reports/...`

### Retailer portal
- `/portal/dashboard`
- `/portal/orders`
- `/portal/orders/:id`
- `/portal/invoices`
- `/portal/invoices/:id`
- `/portal/dues`
- `/portal/profile`

### Driver / staff portal
- `/staff/dashboard`
- `/staff/trips/today`
- `/staff/trips/:id`
- `/staff/trips/:id/stops`
- `/staff/delivery-stops/:id`
- `/staff/collections`

---

## 3.2 Standard frontend page sections
Most pages should support:
- search
- filters
- pagination
- KPI cards where relevant
- table/card view
- empty states
- loading states
- permission-based action buttons

---

# 4. Auth Pages to API Mapping

## 4.1 Login page
**Route:** `/login`

### UI elements
- mobile/email field
- password field
- login button
- forgot password link
- OTP login link

### APIs
- `POST /auth/login`
- `GET /auth/me`
- `GET /auth/my-permissions`

### Frontend flow
1. submit login form
2. store access/refresh token
3. fetch current user
4. redirect based on role:
   - owner/admin → `/app/dashboard`
   - retailer → `/portal/dashboard`
   - staff/driver → `/staff/dashboard`

---

## 4.2 OTP login page
**Route:** `/otp-login`

### APIs
- `POST /auth/send-otp`
- `POST /auth/verify-otp`
- `GET /auth/me`

---

## 4.3 Forgot password page
**Route:** `/forgot-password`

### APIs
- `POST /auth/forgot-password`

---

## 4.4 Reset password page
**Route:** `/reset-password`

### APIs
- `POST /auth/reset-password`

---

# 5. Admin / Backoffice Dashboard Mapping

## 5.1 Main dashboard page
**Route:** `/app/dashboard`

### UI blocks
- today sales card
- pending deliveries card
- orders awaiting approval card
- cash collection card
- outstanding payments card
- stock value card
- low stock alerts card
- expiring products card
- monthly sales chart
- top products
- top retailers
- delivery performance chart
- staff performance chart

### APIs
- `GET /dashboard/summary`
- `GET /dashboard/charts/monthly-sales`
- `GET /dashboard/charts/top-products`
- `GET /dashboard/charts/top-retailers`
- `GET /dashboard/charts/delivery-performance`
- `GET /dashboard/charts/staff-performance`
- `GET /dashboard/owner` or `GET /dashboard/operations`

### Suggested filters
- date
- fromDate
- toDate
- routeId

---

# 6. Retailer Management Pages

## 6.1 Retailer list page
**Route:** `/app/retailers`

### UI blocks
- search bar
- filters: route, salesperson, category, status, ordering mode
- create retailer button
- retailer table/cards
- quick actions:
  - edit
  - set assisted mode
  - credit settings
  - route assignment
  - open ledger

### APIs
- `GET /retailers`
- `POST /retailers`
- `PATCH /retailers/:id/status`
- `PATCH /retailers/:id/ordering-mode`
- `PATCH /retailers/:id/credit-settings`
- `PATCH /retailers/:id/route-assignment`

---

## 6.2 Retailer detail page
**Route:** `/app/retailers/:id`

### Tabs
- profile
- documents
- orders
- invoices
- payments
- ledger
- returns
- crates

### APIs
- `GET /retailers/:id`
- `PATCH /retailers/:id`
- `GET /retailers/:id/documents`
- `POST /retailers/:id/documents`
- `DELETE /retailers/:id/documents/:documentId`
- `GET /retailers/:id/orders`
- `GET /retailers/:id/invoices`
- `GET /retailers/:id/payments`
- `GET /retailers/:id/ledger-summary`
- `GET /retailers/:id/ledger-transactions`
- `GET /retailers/:id/outstanding`
- `GET /retailers/:id/statements`
- `GET /retailers/:id/returns`
- `GET /retailers/:id/crates`

### Important note
This page should clearly show whether retailer is:
- `self_service`
- `assisted`
- `hybrid`

And must include quick actions:
- **Create Order on Behalf**
- **Generate Invoice on Behalf**

---

# 7. Product and Catalog Pages

## 7.1 Product list page
**Route:** `/app/products`

### APIs
- `GET /products`
- `POST /products`
- `PATCH /products/:id`
- `PATCH /products/:id/status`

### Variant actions
- `GET /products/:id/variants`
- `POST /products/:id/variants`
- `PATCH /product-variants/:id`
- `PATCH /product-variants/:id/status`

---

## 7.2 Pricing page
**Route:** `/app/products/pricing` or `/app/pricing`

### APIs
- `GET /price-books`
- `POST /price-books`
- `GET /price-books/:id/items`
- `POST /price-books/:id/items`
- `PATCH /price-book-items/:itemId`
- `GET /price-books/:id/assignments`
- `POST /price-books/:id/assignments`
- `PATCH /price-book-assignments/:assignmentId`
- `GET /promotions`
- `POST /promotions`
- `PATCH /promotions/:id`
- `POST /pricing/preview`

---

# 8. Sales Order Pages

## 8.1 Sales order list page
**Route:** `/app/sales-orders`

### UI blocks
- filters: status, source, retailer, route, cycle, dates
- search by order no
- quick create order
- assisted order button
- approve/reject/cancel/recalculate actions

### APIs
- `GET /sales-orders`
- `POST /sales-orders`
- `POST /sales-orders/assisted`
- `POST /sales-orders/:id/approve`
- `POST /sales-orders/:id/reject`
- `POST /sales-orders/:id/cancel`
- `POST /sales-orders/:id/duplicate`
- `POST /sales-orders/:id/recalculate`

---

## 8.2 Sales order detail page
**Route:** `/app/sales-orders/:id`

### APIs
- `GET /sales-orders/:id`
- `PATCH /sales-orders/:id`

### UI sections
- retailer info
- order source (`retailer/admin/salesperson`)
- item list
- totals
- linked delivery cycle
- linked invoices
- consolidation lock status
- status history

---

## 8.3 Assisted order modal/page
**Route:** modal from retailer detail page or `/app/sales-orders/new-assisted`

### APIs
- `POST /sales-orders/assisted`
- `GET /retailers/:id`
- `GET /catalog/products`

### Business use
For retailers who order by phone/office.

---

# 9. Demand Consolidation Pages

## 9.1 Consolidation list page
**Route:** `/app/demand-consolidations`

### APIs
- `GET /demand-consolidations`
- `POST /demand-consolidations`

### UI actions
- create for delivery cycle
- open detail
- rebuild
- approve
- export
- WhatsApp share

---

## 9.2 Consolidation detail page
**Route:** `/app/demand-consolidations/:id`

### UI blocks
- header summary
- delivery cycle info
- product-wise demand table
- editable buffer qty
- editable final procurement qty
- route-wise tab
- area-wise tab
- source orders tab

### APIs
- `GET /demand-consolidations/:id`
- `GET /demand-consolidations/:id/items`
- `PATCH /demand-consolidations/:id/items/:itemId`
- `POST /demand-consolidations/:id/rebuild`
- `POST /demand-consolidations/:id/approve`
- `GET /demand-consolidations/:id/source-orders`
- `GET /demand-consolidations/:id/summary/product-wise`
- `GET /demand-consolidations/:id/summary/route-wise`
- `GET /demand-consolidations/:id/summary/area-wise`
- `GET /demand-consolidations/:id/export?format=pdf`
- `GET /demand-consolidations/:id/export?format=xlsx`
- `POST /demand-consolidations/:id/share/whatsapp`

---

# 10. Purchase Order Pages

## 10.1 PO list page
**Route:** `/app/purchase-orders`

### APIs
- `GET /purchase-orders`
- `POST /purchase-orders`
- `POST /purchase-orders/from-demand-consolidation`

### UI actions
- manual PO
- create from consolidation
- approve
- cancel

---

## 10.2 PO detail page
**Route:** `/app/purchase-orders/:id`

### APIs
- `GET /purchase-orders/:id`
- `GET /purchase-orders/:id/items`
- `PATCH /purchase-orders/:id`
- `POST /purchase-orders/:id/approve`
- `POST /purchase-orders/:id/cancel`

### UI sections
- supplier info
- source consolidation info
- PO items
- totals
- GRN receipt summary

---

# 11. GRN Pages

## 11.1 GRN list page
**Route:** `/app/goods-receipts`

### APIs
- `GET /goods-receipts`
- `POST /goods-receipts`

### UI actions
- create GRN
- approve GRN
- post GRN
- view comparison

---

## 11.2 GRN detail page
**Route:** `/app/goods-receipts/:id`

### APIs
- `GET /goods-receipts/:id`
- `PATCH /goods-receipts/:id`
- `POST /goods-receipts/:id/approve`
- `POST /goods-receipts/:id/post`
- `GET /goods-receipts/:id/comparison`

### UI sections
- supplier info
- linked PO
- item comparison table
  - ordered
  - received
  - accepted
  - rejected
  - short
  - excess
- batch, MFG, expiry

---

# 12. Inventory Pages

## 12.1 Stock on hand page
**Route:** `/app/inventory/stock`

### APIs
- `GET /inventory/stock-on-hand`

### UI filters
- warehouse
- variant
- category
- low stock
- near expiry

---

## 12.2 Batches page
**Route:** `/app/inventory/batches`

### APIs
- `GET /inventory/batches`
- `GET /inventory/batches/:id`

---

## 12.3 Stock movements page
**Route:** `/app/inventory/movements`

### APIs
- `GET /inventory/stock-movements`
- `GET /inventory/stock-movements/:id`

---

## 12.4 Stock adjustments page
**Route:** `/app/inventory/adjustments`

### APIs
- `GET /stock-adjustments`
- `POST /stock-adjustments`
- `GET /stock-adjustments/:id`
- `PATCH /stock-adjustments/:id`
- `POST /stock-adjustments/:id/approve`
- `POST /stock-adjustments/:id/post`

---

# 13. Dispatch Pages

## 13.1 Dispatch trip list page
**Route:** `/app/dispatch-trips`

### APIs
- `GET /dispatch-trips`
- `POST /dispatch-trips`
- `POST /dispatch-trips/generate`

### UI actions
- create trip
- generate trip from route/cycle
- assign vehicle/driver/helper
- generate loading sheet
- generate challan
- start trip
- complete trip

---

## 13.2 Dispatch trip detail page
**Route:** `/app/dispatch-trips/:id`

### APIs
- `GET /dispatch-trips/:id`
- `POST /dispatch-trips/:id/assign-resources`
- `POST /dispatch-trips/:id/start`
- `POST /dispatch-trips/:id/complete`
- `GET /dispatch-trips/:id/stops`
- `GET /dispatch-trips/:id/loading-sheet`
- `POST /dispatch-trips/:id/loading-sheet/generate`
- `POST /dispatch-trips/:id/challan/generate`
- `GET /dispatch-trips/:id/challan`

### UI sections
- trip header
- route and cycle
- vehicle and staff
- trip items
- stop list
- challan block
- loading sheet block

---

# 14. Delivery Pages

## 14.1 Delivery stop detail page
**Route:** `/app/delivery-stops/:id`

### APIs
- `GET /delivery-stops/:id`
- `POST /delivery-stops/:id/status`
- `POST /delivery-stops/:id/mark-delivered`
- `POST /delivery-stops/:id/mark-partial`
- `POST /delivery-stops/:id/mark-failed`
- `POST /delivery-stops/:id/mark-refused`
- `POST /delivery-stops/:id/collections`
- `POST /delivery-stops/:id/crates`
- `POST /delivery-stops/:id/proof-of-delivery`

### UI sections
- retailer info
- order info
- item delivery table
- collection form
- crate form
- proof upload

---

# 15. Sales Invoice Pages

## 15.1 Sales invoice list page
**Route:** `/app/sales-invoices`

### APIs
- `GET /sales-invoices`
- `POST /sales-invoices/generate`
- `POST /sales-invoices/assisted`

### UI actions
- generate invoice
- generate assisted invoice
- open invoice
- export
- WhatsApp share

---

## 15.2 Sales invoice detail page
**Route:** `/app/sales-invoices/:id`

### APIs
- `GET /sales-invoices/:id`
- `POST /sales-invoices/:id/post`
- `POST /sales-invoices/:id/cancel`
- `GET /sales-invoices/:id/export?format=pdf`
- `GET /sales-invoices/:id/export?format=xlsx`
- `POST /sales-invoices/:id/share/whatsapp`

### UI sections
- retailer info
- linked order/trip
- invoice items
- totals
- outstanding amount
- allocation history

---

# 16. Payments Pages

## 16.1 Payment receipts list page
**Route:** `/app/payments`

### APIs
- `GET /payment-receipts`
- `POST /payment-receipts`

### UI actions
- create receipt
- confirm receipt
- cancel receipt
- view allocations

---

## 16.2 Payment receipt detail page
**Route:** `/app/payments/:id`

### APIs
- `GET /payment-receipts/:id`
- `POST /payment-receipts/:id/confirm`
- `POST /payment-receipts/:id/cancel`
- `GET /payment-receipts/:id/allocations`
- `POST /payment-receipts/:id/allocations`

---

## 16.3 Outstanding pages
**Routes:**
- `/app/payments/outstanding/retailers`
- `/app/payments/outstanding/suppliers`
- `/app/payments/outstanding/aging`

### APIs
- `GET /outstanding/retailers`
- `GET /outstanding/suppliers`
- `GET /outstanding/aging`

---

# 17. Accounting Pages

## 17.1 Accounts page
**Route:** `/app/accounting/accounts`

### APIs
- `GET /accounts`

---

## 17.2 Journal entries page
**Route:** `/app/accounting/journals`

### APIs
- `GET /journal-entries`

---

## 17.3 Journal detail page
**Route:** `/app/accounting/journals/:id`

### APIs
- `GET /journal-entries/:id`

---

## 17.4 Ledger pages
**Routes:**
- `/app/accounting/ledger/customers`
- `/app/accounting/ledger/suppliers`
- `/app/accounting/ledger/account/:accountId`

### APIs
- `GET /ledger/customers`
- `GET /ledger/suppliers`
- `GET /ledger/account/:accountId`

---

## 17.5 Financial statement pages
**Routes:**
- `/app/accounting/trial-balance`
- `/app/accounting/profit-loss`
- `/app/accounting/balance-sheet`

### APIs
- `GET /finance/trial-balance`
- `GET /finance/profit-loss`
- `GET /finance/balance-sheet`

---

# 18. Report Pages

## Suggested report routes
- `/app/reports/daily-purchase`
- `/app/reports/daily-dispatch`
- `/app/reports/product-wise-sales`
- `/app/reports/retailer-wise-sales`
- `/app/reports/route-wise-sales`
- `/app/reports/staff-performance`
- `/app/reports/collection`
- `/app/reports/outstanding`
- `/app/reports/fast-moving-products`
- `/app/reports/slow-moving-products`
- `/app/reports/product-expiry`
- `/app/reports/damage`
- `/app/reports/return`
- `/app/reports/crate`
- `/app/reports/profit`
- `/app/reports/inventory-movement`
- `/app/reports/monthly-business-summary`

### APIs
- `GET /reports/daily-purchase`
- `GET /reports/daily-dispatch`
- `GET /reports/product-wise-sales`
- `GET /reports/retailer-wise-sales`
- `GET /reports/route-wise-sales`
- `GET /reports/staff-performance`
- `GET /reports/collection`
- `GET /reports/outstanding`
- `GET /reports/fast-moving-products`
- `GET /reports/slow-moving-products`
- `GET /reports/product-expiry`
- `GET /reports/damage`
- `GET /reports/return`
- `GET /reports/crate`
- `GET /reports/profit`
- `GET /reports/inventory-movement`
- `GET /reports/monthly-business-summary`

### Common filter panel
- date / from-to date
- route
- retailer
- supplier
- product / variant
- staff
- vehicle
- format

---

# 19. Retailer Portal Mapping

## 19.1 Retailer dashboard
**Route:** `/portal/dashboard`

### APIs
- `GET /dashboard/retailer`

### Show
- latest order
- recent invoices
- outstanding amount

---

## 19.2 Retailer orders page
**Route:** `/portal/orders`

### APIs
- `GET /my/orders`
- `POST /my/orders`

### Important
Admin-created orders must also appear here.

---

## 19.3 Retailer order detail page
**Route:** `/portal/orders/:id`

### APIs
- `GET /my/orders/:id`
- `POST /my/orders/:id/repeat`

---

## 19.4 Retailer invoices page
**Route:** `/portal/invoices`

### APIs
- `GET /my/invoices`

### Important
Admin-generated invoices must also appear here.

---

## 19.5 Retailer invoice detail page
**Route:** `/portal/invoices/:id`

### APIs
- `GET /my/invoices/:id`

---

## 19.6 Retailer dues page
**Route:** `/portal/dues`

### APIs
- `GET /my/dues`

---

# 20. Driver / Staff Portal Mapping

## 20.1 Driver dashboard
**Route:** `/staff/dashboard`

### APIs
- `GET /dashboard/driver`

---

## 20.2 Today trips page
**Route:** `/staff/trips/today`

### APIs
- `GET /my/trips/today`

---

## 20.3 Trip detail page
**Route:** `/staff/trips/:id`

### APIs
- `GET /my/trips/:id`
- `GET /my/trips/:id/stops`

---

## 20.4 Delivery stop page
**Route:** `/staff/delivery-stops/:id`

### APIs
- `POST /my/delivery-stops/:id/status`
- `POST /my/delivery-stops/:id/collections`
- `POST /my/delivery-stops/:id/crates`
- `POST /my/delivery-stops/:id/proof-of-delivery`

---

## 20.5 Collection summary page
**Route:** `/staff/collections`

### APIs
- `GET /my/collection-summary`

---

# 21. Best Frontend Build Order

To make this practical, I recommend building frontend in this order:

## Phase 1 — Core shell and auth
1. login
2. role-based layout
3. sidebar/navigation
4. token/session handling

## Phase 2 — Most important admin workflow
5. dashboard
6. retailers
7. products
8. sales orders
9. demand consolidations
10. purchase orders
11. GRN
12. inventory stock pages

## Phase 3 — Distribution workflow
13. dispatch trips
14. delivery stops
15. staff trip screens
16. sales invoices
17. payments

## Phase 4 — Visibility workflow
18. accounting screens
19. reports
20. retailer portal
21. advanced dashboard widgets

---

# 22. Most Important Business-Specific Frontend Rule
This is critical for your business:

## Assisted retailer workflow rule
If admin creates:
- order on behalf of retailer
- invoice on behalf of retailer

then frontend must still show the same data in retailer portal pages:
- `/portal/orders`
- `/portal/orders/:id`
- `/portal/invoices`
- `/portal/invoices/:id`
- `/portal/dues`

That means frontend must rely on **retailer-linked records**, not on “who created it.”

---

# 23. Recommended Next Step
After this mapping, the best next step is one of these:

1. **Create frontend information architecture / navigation map**
2. **Create wireframe for each major page**
3. **Create Next.js app folder structure**
4. **Start frontend code scaffolding**
