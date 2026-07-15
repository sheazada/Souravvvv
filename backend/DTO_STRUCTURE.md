# NestJS DTO Structure — Dairy Distributor ERP

This scaffold adds DTO folders for the most important ERP modules.

## Created DTO groups

### Common
- `backend/src/common/dto/*`
- pagination, date-range, status toggle

### Core
- `backend/src/core/auth/dto/*`
- login, OTP, token refresh, password reset

### Masters
- `backend/src/masters/retailers/dto/*`
- retailer create/update/query
- assisted ordering mode toggle
- credit settings
- route assignment
- retailer documents

- `backend/src/masters/products/dto/*`
- product and variant create/update/query

- `backend/src/masters/delivery-cycles/dto/*`
- create/update/query/resolve delivery cycle

### Operations
- `backend/src/operations/sales-orders/dto/*`
- self-service order DTOs
- assisted order DTOs
- order item DTO
- query and action DTOs

- `backend/src/operations/demand-consolidations/dto/*`
- create/query/update DTOs
- editable demand item DTO

- `backend/src/operations/purchase-orders/dto/*`
- manual PO DTOs
- generate PO from consolidation DTO

- `backend/src/operations/goods-receipts/dto/*`
- GRN header and line DTOs

- `backend/src/operations/inventory/dto/*`
- stock on hand filters
- stock adjustment DTOs

- `backend/src/operations/dispatch/dto/*`
- dispatch trip create/generate/query DTOs

- `backend/src/operations/delivery/dto/*`
- stop status update DTOs
- collection entry DTOs
- crate entry DTOs
- proof of delivery DTOs

- `backend/src/operations/sales-invoices/dto/*`
- invoice generation and assisted billing DTOs

- `backend/src/operations/payments/dto/*`
- payment receipt and allocation DTOs

## Most important business-specific DTOs
Because your business needs office/admin-assisted workflows, these DTOs are especially important:

- `masters/retailers/dto/update-ordering-mode.dto.ts`
- `operations/sales-orders/dto/create-assisted-sales-order.dto.ts`
- `operations/sales-invoices/dto/create-assisted-sales-invoice.dto.ts`
- `operations/payments/dto/create-payment-receipt.dto.ts`

These support the flow where:
- admin creates order for retailer
- admin generates invoice for retailer
- retailer still sees order, invoice, dues, and ledger

## Recommended next step
After DTO structure, the best next move is:
1. generate controllers/services for auth
2. generate controllers/services for retailers
3. generate controllers/services for sales-orders
4. generate controllers/services for demand-consolidations
5. wire DTOs into request validation
