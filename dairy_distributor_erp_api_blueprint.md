# Dairy Distributor ERP — API Endpoint Blueprint

## 1. Purpose
This document defines the **API-first backend blueprint** for the Dairy Distributor ERP.

It is designed for:
- **NestJS + Prisma + PostgreSQL** backend
- **REST API** architecture
- **mobile-first web app / PWA** frontend
- future Android/iPhone app reuse

This blueprint covers:
- authentication
- master data
- assisted retailer ordering
- daily demand consolidation
- procurement
- inventory
- dispatch and delivery
- invoicing and collections
- accounting
- reports
- notifications
- offline sync
- AI-ready endpoints

---

## 2. API Standards

## 2.1 Base URL
```http
/api/v1
```

Examples:
- `POST /api/v1/auth/login`
- `GET /api/v1/retailers`
- `POST /api/v1/sales-orders`

---

## 2.2 Authentication
Use:
- **JWT access token**
- refresh token or secure session token

Headers:
```http
Authorization: Bearer <access_token>
X-Organization-Id: <organization_uuid>
```

For single-tenant first version, `X-Organization-Id` can be derived server-side after login.

---

## 2.3 Response Format
Recommended standard success format:

```json
{
  "success": true,
  "message": "Sales order created successfully",
  "data": {},
  "meta": {}
}
```

Recommended error format:

```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "retailerId",
        "message": "Retailer is required"
      }
    ]
  }
}
```

---

## 2.4 Pagination Format
For list endpoints:

```http
GET /api/v1/retailers?page=1&limit=20&search=anand&sort=shopName:asc
```

Response meta:

```json
{
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 86,
    "totalPages": 5
  }
}
```

---

## 2.5 Filtering Conventions
Recommended filter style:

```http
GET /api/v1/sales-orders?status=approved&routeId=...&deliveryCycleId=...
```

Date filters:
```http
?fromDate=2026-07-01&toDate=2026-07-31
```

---

## 2.6 Idempotency
For critical create actions, support:
```http
Idempotency-Key: <uuid>
```

Important for:
- payment receipt creation
- invoice generation
- offline delivery sync
- assisted order creation

---

## 2.7 File Uploads
Use multipart endpoints for:
- retailer documents
- product images
- invoice PDFs
- proof of delivery photos
- return images

---

## 2.8 Audit and Source Tracking
Critical endpoints must automatically store:
- acting user
- source type
- changed fields
- timestamp
- IP/device if available

Especially for:
- admin-assisted orders
- manual invoice generation
- payment edits
- stock adjustments
- journal changes

---

# 3. Role Access Summary

## Core roles
- Super Admin
- Owner
- Operations Admin
- Accountant
- Procurement Manager
- Inventory Manager
- Dispatch Manager
- Driver / Delivery Staff
- Salesperson
- Retailer

## Example access logic
- **Retailer** only sees their own orders, invoices, ledger, returns
- **Driver** only sees assigned trips, stops, collections, crate actions
- **Accountant** sees invoices, receipts, ledgers, accounting, reports
- **Operations Admin** sees orders, demand, dispatch, delivery, retailer masters
- **Owner** sees all

---

# 4. Auth and Session APIs

## 4.1 Authentication

### POST `/auth/login`
Login with mobile/email + password.

**Body**
```json
{
  "login": "9345678901",
  "password": "secret"
}
```

### POST `/auth/login-otp`
Login with mobile + OTP flow.

### POST `/auth/send-otp`
Send OTP to mobile.

### POST `/auth/verify-otp`
Verify OTP and issue token.

### POST `/auth/refresh`
Refresh access token.

### POST `/auth/logout`
Logout current session.

### POST `/auth/logout-all`
Logout all sessions.

### POST `/auth/forgot-password`
Initiate password reset.

### POST `/auth/reset-password`
Reset password.

### GET `/auth/me`
Get currently logged-in user profile and role context.

### GET `/auth/my-permissions`
Get effective permission list.

---

# 5. User, Role, Permission APIs

## 5.1 Users
### GET `/users`
List users.

### POST `/users`
Create user.

### GET `/users/:id`
Get user detail.

### PATCH `/users/:id`
Update user.

### PATCH `/users/:id/status`
Activate/deactivate user.

### PATCH `/users/:id/reset-password`
Admin reset password.

## 5.2 Roles
### GET `/roles`
### POST `/roles`
### GET `/roles/:id`
### PATCH `/roles/:id`
### DELETE `/roles/:id`

## 5.3 Permissions
### GET `/permissions`
### GET `/roles/:id/permissions`
### PUT `/roles/:id/permissions`
Replace role permission mapping.

## 5.4 User role assignment
### PUT `/users/:id/roles`
Assign one or more roles.

---

# 6. Organization and Settings APIs

## 6.1 Organization
### GET `/organization/profile`
### PATCH `/organization/profile`

## 6.2 System settings
### GET `/settings`
Grouped settings list.

### GET `/settings/:group`
Get one settings group.

### PUT `/settings/:group`
Update settings group.

Important groups:
- business_rules
- invoice
- gst
- whatsapp
- sms
- printer
- theme
- language
- assisted_mode

## 6.3 Numbering series
### GET `/settings/number-series`
### PUT `/settings/number-series`

## 6.4 Backup / restore metadata
### GET `/settings/backups`
### POST `/settings/backups`
### POST `/settings/backups/:id/restore`

---

# 7. Dashboard APIs

## 7.1 Main dashboard
### GET `/dashboard/summary`
Return key KPIs.

**Query params**
- `date`
- `fromDate`
- `toDate`
- `routeId`

**Response widgets may include**
- todaySales
- pendingDeliveries
- ordersAwaitingApproval
- cashCollection
- outstandingPayments
- stockValue
- lowStockCount
- expiringProductsCount

## 7.2 Dashboard charts
### GET `/dashboard/charts/monthly-sales`
### GET `/dashboard/charts/top-products`
### GET `/dashboard/charts/top-retailers`
### GET `/dashboard/charts/delivery-performance`
### GET `/dashboard/charts/staff-performance`

## 7.3 Role-specific dashboards
### GET `/dashboard/owner`
### GET `/dashboard/operations`
### GET `/dashboard/finance`
### GET `/dashboard/dispatch`
### GET `/dashboard/retailer`
### GET `/dashboard/driver`

---

# 8. Master Data APIs

## 8.1 Areas
### GET `/areas`
### POST `/areas`
### GET `/areas/:id`
### PATCH `/areas/:id`
### DELETE `/areas/:id`

## 8.2 Routes
### GET `/routes`
### POST `/routes`
### GET `/routes/:id`
### PATCH `/routes/:id`
### DELETE `/routes/:id`

### GET `/routes/:id/retailers`
List retailers on route.

### PUT `/routes/:id/retailers`
Replace route retailer mapping + stop sequence.

## 8.3 Employees
### GET `/employees`
### POST `/employees`
### GET `/employees/:id`
### PATCH `/employees/:id`
### PATCH `/employees/:id/status`

## 8.4 Vehicles
### GET `/vehicles`
### POST `/vehicles`
### GET `/vehicles/:id`
### PATCH `/vehicles/:id`
### PATCH `/vehicles/:id/status`

---

# 9. Supplier APIs

## 9.1 Suppliers
### GET `/suppliers`
### POST `/suppliers`
### GET `/suppliers/:id`
### PATCH `/suppliers/:id`
### PATCH `/suppliers/:id/status`

## 9.2 Supplier ledger summary
### GET `/suppliers/:id/ledger-summary`
### GET `/suppliers/:id/ledger-transactions`

## 9.3 Supplier analytics
### GET `/suppliers/:id/analytics`
May include:
- fill rate
- return rate
- last purchase date
- payable balance

---

# 10. Retailer APIs

## 10.1 Retailers
### GET `/retailers`
### POST `/retailers`
### GET `/retailers/:id`
### PATCH `/retailers/:id`
### PATCH `/retailers/:id/status`

## 10.2 Retailer assisted mode
### PATCH `/retailers/:id/ordering-mode`
Update retailer order mode.

**Body**
```json
{
  "orderingMode": "assisted",
  "isOrderingEnabled": true,
  "isBillingEnabled": true
}
```

This is important for your business because many retailers may depend on the office/admin for order entry and invoice generation.

## 10.3 Retailer route assignment
### PATCH `/retailers/:id/route-assignment`

## 10.4 Retailer credit controls
### PATCH `/retailers/:id/credit-settings`

## 10.5 Retailer documents
### GET `/retailers/:id/documents`
### POST `/retailers/:id/documents`
### DELETE `/retailers/:id/documents/:documentId`

## 10.6 Retailer financial view
### GET `/retailers/:id/ledger-summary`
### GET `/retailers/:id/ledger-transactions`
### GET `/retailers/:id/outstanding`
### GET `/retailers/:id/statements`

## 10.7 Retailer activity
### GET `/retailers/:id/orders`
### GET `/retailers/:id/invoices`
### GET `/retailers/:id/payments`
### GET `/retailers/:id/returns`
### GET `/retailers/:id/crates`

---

# 11. Product and Catalog APIs

## 11.1 Brands
### GET `/brands`
### POST `/brands`
### PATCH `/brands/:id`

## 11.2 Categories
### GET `/product-categories`
### POST `/product-categories`
### PATCH `/product-categories/:id`

## 11.3 Units
### GET `/units`
### POST `/units`
### PATCH `/units/:id`

## 11.4 Tax codes
### GET `/tax-codes`
### POST `/tax-codes`
### PATCH `/tax-codes/:id`

## 11.5 Crate types
### GET `/crate-types`
### POST `/crate-types`
### PATCH `/crate-types/:id`

## 11.6 Products
### GET `/products`
### POST `/products`
### GET `/products/:id`
### PATCH `/products/:id`
### PATCH `/products/:id/status`

## 11.7 Product variants
### GET `/products/:id/variants`
### POST `/products/:id/variants`
### GET `/product-variants/:id`
### PATCH `/product-variants/:id`
### PATCH `/product-variants/:id/status`

## 11.8 Product images
### POST `/product-variants/:id/images`
### DELETE `/product-images/:imageId`
### PATCH `/product-images/:imageId/primary`

## 11.9 Public/retailer catalog
### GET `/catalog/products`
Retailer-friendly product list with effective pricing.

Query:
- `search`
- `categoryId`
- `availableOnly=true`

---

# 12. Pricing Engine APIs

## 12.1 Price books
### GET `/price-books`
### POST `/price-books`
### GET `/price-books/:id`
### PATCH `/price-books/:id`
### PATCH `/price-books/:id/status`

## 12.2 Price book assignments
### GET `/price-books/:id/assignments`
### POST `/price-books/:id/assignments`
### PATCH `/price-book-assignments/:assignmentId`
### DELETE `/price-book-assignments/:assignmentId`

## 12.3 Price book items
### GET `/price-books/:id/items`
### POST `/price-books/:id/items`
### PATCH `/price-book-items/:itemId`
### DELETE `/price-book-items/:itemId`

## 12.4 Promotions
### GET `/promotions`
### POST `/promotions`
### GET `/promotions/:id`
### PATCH `/promotions/:id`
### PATCH `/promotions/:id/status`

## 12.5 Effective pricing preview
### POST `/pricing/preview`
Returns effective price for a retailer/order context.

**Body**
```json
{
  "retailerId": "uuid",
  "items": [
    { "variantId": "uuid", "qty": 20 }
  ],
  "deliveryDate": "2026-07-10"
}
```

---

# 13. Delivery Cycle and Cut-Off APIs

## 13.1 Delivery cycles
### GET `/delivery-cycles`
### POST `/delivery-cycles`
### GET `/delivery-cycles/:id`
### PATCH `/delivery-cycles/:id`
### PATCH `/delivery-cycles/:id/status`

## 13.2 Cut-off rules
### GET `/cutoff-rules`
### PUT `/cutoff-rules`

Could support:
- global cut-off
- route-wise cut-off
- retailer category cut-off

## 13.3 Cycle resolution helper
### POST `/delivery-cycles/resolve`
Given timestamp + retailer/route, return applicable cycle.

---

# 14. Sales Order APIs

## 14.1 Sales orders
### GET `/sales-orders`
Query filters:
- `status`
- `source`
- `retailerId`
- `routeId`
- `deliveryCycleId`
- `fromDate`
- `toDate`

### POST `/sales-orders`
Create order.

Supports all sources:
- retailer self-order
- admin order
- salesperson order

**Body**
```json
{
  "retailerId": "uuid",
  "source": "admin",
  "notes": "Phone order from retailer",
  "items": [
    { "variantId": "uuid", "qty": 20 },
    { "variantId": "uuid", "qty": 2 }
  ]
}
```

### GET `/sales-orders/:id`
### PATCH `/sales-orders/:id`
### DELETE `/sales-orders/:id`
Soft-cancel in practice.

## 14.2 Order actions
### POST `/sales-orders/:id/approve`
### POST `/sales-orders/:id/reject`
### POST `/sales-orders/:id/cancel`
### POST `/sales-orders/:id/duplicate`
### POST `/sales-orders/:id/recalculate`

## 14.3 Assisted order creation
### POST `/sales-orders/assisted`
Special endpoint for admin/salesperson order-on-behalf flow.

**Business rule**
Even if admin creates the order, it must still be saved under the retailer account and appear in retailer dashboard/history.

## 14.4 Retailer self-order endpoints
### GET `/my/orders`
### POST `/my/orders`
### GET `/my/orders/:id`
### POST `/my/orders/:id/repeat`

---

# 15. Automatic Daily Demand Consolidation APIs

This is the **highest-priority workflow** in your ERP.

## 15.1 Consolidation runs
### GET `/demand-consolidations`
### POST `/demand-consolidations`
Generate consolidation for a delivery cycle.

**Body**
```json
{
  "deliveryCycleId": "uuid",
  "includeStatuses": ["approved"]
}
```

### GET `/demand-consolidations/:id`
### PATCH `/demand-consolidations/:id`
Update notes / editable quantities.

### POST `/demand-consolidations/:id/rebuild`
Recompute from included orders.

### POST `/demand-consolidations/:id/approve`
Lock approved demand.

## 15.2 Consolidation items
### GET `/demand-consolidations/:id/items`
### PATCH `/demand-consolidations/:id/items/:itemId`
Edit buffer or final procurement qty.

## 15.3 Source orders
### GET `/demand-consolidations/:id/source-orders`

## 15.4 Export and sharing
### GET `/demand-consolidations/:id/export?format=pdf`
### GET `/demand-consolidations/:id/export?format=xlsx`
### POST `/demand-consolidations/:id/share/whatsapp`

## 15.5 Demand summary views
### GET `/demand-consolidations/:id/summary/product-wise`
### GET `/demand-consolidations/:id/summary/route-wise`
### GET `/demand-consolidations/:id/summary/area-wise`

---

# 16. Procurement APIs

## 16.1 Purchase orders
### GET `/purchase-orders`
### POST `/purchase-orders`
### GET `/purchase-orders/:id`
### PATCH `/purchase-orders/:id`
### POST `/purchase-orders/:id/approve`
### POST `/purchase-orders/:id/cancel`

## 16.2 Generate PO from demand consolidation
### POST `/purchase-orders/from-demand-consolidation`

**Body**
```json
{
  "demandConsolidationId": "uuid",
  "supplierId": "uuid"
}
```

## 16.3 PO items
### GET `/purchase-orders/:id/items`
### POST `/purchase-orders/:id/items`
### PATCH `/purchase-order-items/:itemId`
### DELETE `/purchase-order-items/:itemId`

## 16.4 Goods receipt notes (GRN)
### GET `/goods-receipts`
### POST `/goods-receipts`
### GET `/goods-receipts/:id`
### PATCH `/goods-receipts/:id`
### POST `/goods-receipts/:id/approve`
### POST `/goods-receipts/:id/post`

**Important**
Inventory should update after approved/posted GRN.

## 16.5 GRN comparison APIs
### GET `/goods-receipts/:id/comparison`
Returns:
- ordered qty
- received qty
- accepted qty
- rejected qty
- short qty
- excess qty

## 16.6 Purchase invoices
### GET `/purchase-invoices`
### POST `/purchase-invoices`
### GET `/purchase-invoices/:id`
### PATCH `/purchase-invoices/:id`
### POST `/purchase-invoices/:id/post`

## 16.7 Supplier returns
### GET `/supplier-returns`
### POST `/supplier-returns`
### GET `/supplier-returns/:id`
### PATCH `/supplier-returns/:id`
### POST `/supplier-returns/:id/approve`
### POST `/supplier-returns/:id/dispatch`

---

# 17. Inventory APIs

## 17.1 Warehouses
### GET `/warehouses`
### POST `/warehouses`
### PATCH `/warehouses/:id`

## 17.2 Stock on hand
### GET `/inventory/stock-on-hand`
Filters:
- warehouseId
- variantId
- categoryId
- nearExpiry=true
- lowStock=true

## 17.3 Batches
### GET `/inventory/batches`
### GET `/inventory/batches/:id`

## 17.4 Stock ledger / movement
### GET `/inventory/stock-movements`
### GET `/inventory/stock-movements/:id`

## 17.5 Stock adjustments
### GET `/stock-adjustments`
### POST `/stock-adjustments`
### GET `/stock-adjustments/:id`
### PATCH `/stock-adjustments/:id`
### POST `/stock-adjustments/:id/approve`
### POST `/stock-adjustments/:id/post`

## 17.6 Expiry and low stock
### GET `/inventory/alerts/low-stock`
### GET `/inventory/alerts/expiring-products`

---

# 18. Dispatch, Vehicle, Driver, Delivery APIs

## 18.1 Dispatch trips
### GET `/dispatch-trips`
### POST `/dispatch-trips`
### GET `/dispatch-trips/:id`
### PATCH `/dispatch-trips/:id`
### POST `/dispatch-trips/:id/assign-vehicle`
### POST `/dispatch-trips/:id/assign-driver`
### POST `/dispatch-trips/:id/start`
### POST `/dispatch-trips/:id/complete`

## 18.2 Generate trip from cycle/route
### POST `/dispatch-trips/generate`

**Body**
```json
{
  "deliveryCycleId": "uuid",
  "routeId": "uuid",
  "vehicleId": "uuid",
  "driverEmployeeId": "uuid"
}
```

## 18.3 Loading sheet
### GET `/dispatch-trips/:id/loading-sheet`
### POST `/dispatch-trips/:id/loading-sheet/generate`
### GET `/dispatch-trips/:id/loading-sheet/export?format=pdf`

## 18.4 Delivery challan
### POST `/dispatch-trips/:id/challan/generate`
### GET `/dispatch-trips/:id/challan`
### GET `/delivery-challans/:id/export?format=pdf`

## 18.5 Delivery stops
### GET `/dispatch-trips/:id/stops`
### GET `/delivery-stops/:id`
### PATCH `/delivery-stops/:id`
### POST `/delivery-stops/:id/mark-delivered`
### POST `/delivery-stops/:id/mark-partial`
### POST `/delivery-stops/:id/mark-failed`
### POST `/delivery-stops/:id/mark-refused`

## 18.6 Driver mobile endpoints
### GET `/my/trips/today`
### GET `/my/trips/:id`
### GET `/my/trips/:id/stops`
### POST `/my/delivery-stops/:id/status`
### POST `/my/delivery-stops/:id/payment`
### POST `/my/delivery-stops/:id/crates`
### POST `/my/delivery-stops/:id/proof-of-delivery`

## 18.7 Delivery reconciliation
### GET `/dispatch-trips/:id/reconciliation`
### POST `/dispatch-trips/:id/reconciliation`
### POST `/dispatch-trips/:id/reconciliation/finalize`

---

# 19. Crate and Packaging APIs

## 19.1 Crate transactions
### GET `/crate-transactions`
### POST `/crate-transactions`
### GET `/crate-transactions/:id`

## 19.2 Retailer crate balance
### GET `/retailers/:id/crate-balance`
### GET `/retailers/:id/crate-history`

## 19.3 Route/trip crate reconciliation
### GET `/dispatch-trips/:id/crates`
### POST `/dispatch-trips/:id/crates/reconcile`

## 19.4 Daily crate report data
### GET `/crates/daily-balance`

---

# 20. Sales Invoice APIs

## 20.1 Sales invoices
### GET `/sales-invoices`
### POST `/sales-invoices`
### GET `/sales-invoices/:id`
### PATCH `/sales-invoices/:id`
### POST `/sales-invoices/:id/post`
### POST `/sales-invoices/:id/cancel`

## 20.2 Generate invoice from delivery/order
### POST `/sales-invoices/generate`

**Body**
```json
{
  "retailerId": "uuid",
  "salesOrderId": "uuid",
  "dispatchTripId": "uuid",
  "source": "assisted_billing"
}
```

## 20.3 Assisted invoice generation
### POST `/sales-invoices/assisted`
Special endpoint for admin invoice generation on behalf of retailer.

**Important business rule**
Invoice must still appear under retailer dashboard, invoices list, dues, ledger, and account statement.

## 20.4 Invoice export/share
### GET `/sales-invoices/:id/export?format=pdf`
### GET `/sales-invoices/:id/export?format=xlsx`
### POST `/sales-invoices/:id/share/whatsapp`

## 20.5 Retailer invoice endpoints
### GET `/my/invoices`
### GET `/my/invoices/:id`
### GET `/my/dues`
### GET `/my/ledger`

---

# 21. Payment and Collection APIs

## 21.1 Payment receipts
### GET `/payment-receipts`
### POST `/payment-receipts`
### GET `/payment-receipts/:id`
### PATCH `/payment-receipts/:id`
### POST `/payment-receipts/:id/confirm`
### POST `/payment-receipts/:id/cancel`

## 21.2 Driver/staff collection entry
### POST `/delivery-stops/:id/collections`
### POST `/my/delivery-stops/:id/collections`

## 21.3 Payment allocations
### GET `/payment-receipts/:id/allocations`
### POST `/payment-receipts/:id/allocations`
### PATCH `/payment-allocations/:id`
### DELETE `/payment-allocations/:id`

## 21.4 Outstanding APIs
### GET `/outstanding/retailers`
### GET `/outstanding/suppliers`
### GET `/outstanding/aging`

---

# 22. Returns and Claims APIs

## 22.1 Sales returns
### GET `/sales-returns`
### POST `/sales-returns`
### GET `/sales-returns/:id`
### PATCH `/sales-returns/:id`
### POST `/sales-returns/:id/approve`
### POST `/sales-returns/:id/reject`
### POST `/sales-returns/:id/receive`
### POST `/sales-returns/:id/settle`

## 22.2 Supplier returns
Already listed under procurement.

## 22.3 Claims
### GET `/claims`
### POST `/claims`
### GET `/claims/:id`
### PATCH `/claims/:id`
### POST `/claims/:id/approve`
### POST `/claims/:id/reject`
### POST `/claims/:id/settle`

## 22.4 Retailer self-service returns
### GET `/my/returns`
### POST `/my/returns`
### GET `/my/returns/:id`

---

# 23. Accounting APIs

## 23.1 Chart of accounts
### GET `/accounts`
### POST `/accounts`
### GET `/accounts/:id`
### PATCH `/accounts/:id`

## 23.2 Journal entries
### GET `/journal-entries`
### POST `/journal-entries`
### GET `/journal-entries/:id`
### PATCH `/journal-entries/:id`
### POST `/journal-entries/:id/post`
### POST `/journal-entries/:id/reverse`

## 23.3 Bank accounts
### GET `/bank-accounts`
### POST `/bank-accounts`
### PATCH `/bank-accounts/:id`

## 23.4 Cash registers
### GET `/cash-registers`
### POST `/cash-registers`
### PATCH `/cash-registers/:id`

## 23.5 Expense categories
### GET `/expense-categories`
### POST `/expense-categories`
### PATCH `/expense-categories/:id`

## 23.6 Expense entries
### GET `/expense-entries`
### POST `/expense-entries`
### GET `/expense-entries/:id`
### PATCH `/expense-entries/:id`
### POST `/expense-entries/:id/post`

## 23.7 Day closing
### GET `/day-closings`
### POST `/day-closings`
### GET `/day-closings/:id`
### POST `/day-closings/:id/close`

## 23.8 Ledger APIs
### GET `/ledger/general`
### GET `/ledger/customers`
### GET `/ledger/suppliers`
### GET `/ledger/account/:accountId`

## 23.9 Financial statements
### GET `/finance/trial-balance`
### GET `/finance/profit-loss`
### GET `/finance/balance-sheet`
### GET `/finance/gst-summary`

---

# 24. Report APIs

Reports should support filters and export.

## 24.1 Core reports
### GET `/reports/daily-purchase`
### GET `/reports/daily-dispatch`
### GET `/reports/product-wise-sales`
### GET `/reports/retailer-wise-sales`
### GET `/reports/route-wise-sales`
### GET `/reports/staff-performance`
### GET `/reports/collection`
### GET `/reports/outstanding`
### GET `/reports/fast-moving-products`
### GET `/reports/slow-moving-products`
### GET `/reports/product-expiry`
### GET `/reports/damage`
### GET `/reports/return`
### GET `/reports/crate`
### GET `/reports/profit`
### GET `/reports/inventory-movement`
### GET `/reports/monthly-business-summary`

## 24.2 Export
Each report may support:
```http
?format=json
?format=pdf
?format=xlsx
?format=print
```

---

# 25. Notification APIs

## 25.1 Templates
### GET `/notification-templates`
### POST `/notification-templates`
### GET `/notification-templates/:id`
### PATCH `/notification-templates/:id`
### PATCH `/notification-templates/:id/status`

## 25.2 Notification logs
### GET `/notification-logs`
### GET `/notification-logs/:id`

## 25.3 Manual send
### POST `/notifications/send`

## 25.4 Event resend
### POST `/notification-logs/:id/retry`

---

# 26. File and Media APIs

## 26.1 Attachments
### GET `/attachments`
### POST `/attachments`
### GET `/attachments/:id`
### DELETE `/attachments/:id`

## 26.2 Entity-specific attachment list
### GET `/attachments/by-entity?entityType=sales_invoice&entityId=uuid`

---

# 27. Offline Sync APIs

## 27.1 Push sync events
### POST `/sync/events`
Push offline updates from device.

## 27.2 Pull sync events
### GET `/sync/events?since=timestamp`

## 27.3 Sync conflicts
### GET `/sync/conflicts`
### POST `/sync/conflicts/:id/resolve`

## 27.4 Device sync status
### GET `/sync/devices/:deviceId/status`

---

# 28. AI and Forecast APIs

## 28.1 Forecast runs
### GET `/forecast-runs`
### POST `/forecast-runs`
### GET `/forecast-runs/:id`

## 28.2 Forecast outputs
### GET `/forecast-runs/:id/items`
### GET `/forecast/demand-summary`
### GET `/forecast/purchase-suggestions`

## 28.3 Buying pattern analysis
### GET `/analytics/customer-buying-patterns`

## 28.4 Smart insights
### GET `/analytics/insights`

## 28.5 OCR invoice scan
### POST `/ai/ocr/purchase-invoice`
Upload invoice image/PDF and parse draft.

## 28.6 Voice order draft
### POST `/ai/voice-order`
Upload audio and return parsed order draft.

## 28.7 AI assistant
### POST `/ai/assistant/query`

---

# 29. Retailer Portal API Group

These endpoints are especially useful for retailer mobile/PWA screens.

### GET `/my/profile`
### PATCH `/my/profile`
### GET `/my/dashboard`
### GET `/my/catalog`
### GET `/my/orders`
### POST `/my/orders`
### GET `/my/orders/:id`
### GET `/my/invoices`
### GET `/my/invoices/:id`
### GET `/my/ledger`
### GET `/my/dues`
### GET `/my/payments`
### GET `/my/returns`
### POST `/my/returns`
### GET `/my/crates`
### GET `/my/notifications`

**Important note for your business:**
Even when order/invoice is created by admin, the retailer must still see it through these `/my/*` endpoints.

---

# 30. Driver/Staff Portal API Group

### GET `/my/trips/today`
### GET `/my/trips/history`
### GET `/my/trips/:id/stops`
### GET `/my/delivery-stops/:id`
### POST `/my/delivery-stops/:id/status`
### POST `/my/delivery-stops/:id/collections`
### POST `/my/delivery-stops/:id/crates`
### POST `/my/delivery-stops/:id/returns`
### POST `/my/delivery-stops/:id/proof-of-delivery`
### GET `/my/collection-summary`

---

# 31. Key Workflow Endpoint Sequences

## 31.1 Assisted retailer ordering flow
1. `GET /retailers/:id`
2. `POST /sales-orders/assisted`
3. `POST /sales-orders/:id/approve`
4. retailer sees order in `GET /my/orders`

## 31.2 Demand consolidation flow
1. `GET /sales-orders?deliveryCycleId=...&status=approved`
2. `POST /demand-consolidations`
3. `GET /demand-consolidations/:id/items`
4. `PATCH /demand-consolidations/:id/items/:itemId`
5. `POST /demand-consolidations/:id/approve`
6. `POST /purchase-orders/from-demand-consolidation`

## 31.3 Procurement to stock flow
1. `POST /purchase-orders/from-demand-consolidation`
2. `POST /goods-receipts`
3. `POST /goods-receipts/:id/approve`
4. `POST /goods-receipts/:id/post`
5. `GET /inventory/stock-on-hand`

## 31.4 Dispatch to invoice flow
1. `POST /dispatch-trips/generate`
2. `POST /dispatch-trips/:id/challan/generate`
3. `POST /delivery-stops/:id/mark-delivered`
4. `POST /sales-invoices/generate`
5. `GET /retailers/:id/ledger-summary`

## 31.5 Collection flow
1. `POST /my/delivery-stops/:id/collections`
2. `POST /payment-receipts/:id/confirm`
3. `POST /payment-receipts/:id/allocations`
4. `GET /sales-invoices/:id`
5. `GET /retailers/:id/outstanding`

---

# 32. Recommended NestJS Module Breakdown

Suggested backend modules:
- auth
- users
- roles
- organization
- settings
- dashboard
- areas
- routes
- employees
- vehicles
- suppliers
- retailers
- products
- pricing
- delivery-cycles
- sales-orders
- demand-consolidations
- purchase-orders
- goods-receipts
- purchase-invoices
- inventory
- dispatch
- delivery
- crates
- sales-invoices
- payments
- returns
- claims
- accounting
- reports
- notifications
- files
- sync
- ai

---

# 33. Recommended Endpoint Priorities

## P0 — Build first
- auth
- retailers
- products/catalog
- delivery cycles
- sales orders
- assisted orders
- demand consolidations
- purchase orders
- GRN
- inventory stock view
- dispatch trips
- delivery stops
- sales invoices
- payments
- dashboard summary

## P1 — Build after core flow works
- supplier returns
- returns/claims
- crate reconciliation
- accounting books
- report exports
- notifications
- sync APIs

## P2 — Advanced layer
- OCR
- voice order
- AI insights
- advanced forecasting

---

# 34. Final Recommendation
For your business, the **most important API modules** are:

1. `sales-orders`
2. `demand-consolidations`
3. `purchase-orders`
4. `goods-receipts`
5. `inventory`
6. `dispatch-trips`
7. `delivery-stops`
8. `sales-invoices`
9. `payment-receipts`
10. `retailers`

And among them, the most critical business-specific feature is:

> **admin-assisted order and invoice creation while keeping full retailer dashboard visibility and unified financial history**

---

# 35. Recommended Next Step
After this API blueprint, the best next step is one of these:

1. **Generate NestJS module structure**
2. **Generate DTO list for major endpoints**
3. **Generate actual controller/service code for auth + retailers + orders**
4. **Create frontend page-to-API mapping**
