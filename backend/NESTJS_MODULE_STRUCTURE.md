# NestJS Module Structure — Dairy Distributor ERP

## Recommended folder layout

```text
backend/
  src/
    app.module.ts
    main.ts
    config/
      app.config.ts
      database.config.ts
      validation.schema.ts
    common/
      decorators/
        current-user.decorator.ts
        roles.decorator.ts
      guards/
        jwt-auth.guard.ts
        roles.guard.ts
      interceptors/
        audit.interceptor.ts
      filters/
        http-exception.filter.ts
    prisma/
      prisma.module.ts
      prisma.service.ts
    core/
      auth/
      users/
      roles/
      organization/
      settings/
      dashboard/
    masters/
      areas/
      routes/
      employees/
      vehicles/
      suppliers/
      retailers/
      products/
      pricing/
      delivery-cycles/
    operations/
      sales-orders/
      demand-consolidations/
      purchase-orders/
      goods-receipts/
      purchase-invoices/
      inventory/
      dispatch/
      delivery/
      crates/
      sales-invoices/
      payments/
      returns/
      claims/
    finance/
      accounting/
      reports/
    integrations/
      notifications/
      files/
      sync/
      ai/
```

## Layer intent

### 1. Core
Cross-cutting business platform modules:
- auth
- users
- roles
- organization
- settings
- dashboard

### 2. Masters
Stable reference/master data:
- areas, routes, employees, vehicles
- suppliers, retailers
- products, pricing
- delivery cycles

### 3. Operations
Daily transaction engine of the ERP:
- sales orders
- demand consolidations
- purchase orders and GRN
- inventory
- dispatch and delivery
- crates
- sales invoices and payments
- returns and claims

### 4. Finance
Financial visibility and compliance:
- accounting
- reports

### 5. Integrations
External services and advanced features:
- notifications
- files
- offline sync
- AI features

## Important business-specific placement

Your most important workflow should live mainly across these modules:
- `sales-orders`
- `demand-consolidations`
- `purchase-orders`
- `goods-receipts`
- `inventory`
- `dispatch`
- `delivery`
- `sales-invoices`
- `payments`
- `retailers`

And your special assisted workflow belongs here:
- `retailers` → retailer assisted mode configuration
- `sales-orders` → admin/salesperson order on behalf of retailer
- `sales-invoices` → admin invoice generation on behalf of retailer
- `payments` → retailer financial history remains unified

## Dependency rules

Recommended dependency direction:
- `core` can be used by all modules
- `masters` can be used by `operations`, `finance`, `integrations`
- `operations` should not depend on `reports`
- `finance` may read transactional modules but should avoid owning operational logic
- `integrations` should consume domain events/services rather than becoming the source of truth

## Suggested module ownership

### Auth module
- login
- OTP flow
- JWT
- refresh tokens
- current user context

### Retailers module
- retailer CRUD
- credit settings
- route assignment
- assisted mode toggle
- retailer documents
- retailer dashboard data aggregation

### Sales Orders module
- self-service retailer orders
- admin-assisted orders
- salesperson-assisted orders
- order approval
- order history and source tagging

### Demand Consolidations module
- product-wise demand aggregation
- route-wise demand summaries
- editable final procurement quantities
- PDF/Excel/WhatsApp output hooks

### Purchase Orders module
- PO generation from consolidation
- PO approval
- supplier linkage

### Goods Receipts module
- GRN creation
- ordered vs received comparison
- batch/MFG/expiry capture
- stock posting trigger

### Inventory module
- stock-on-hand
- batches
- stock movements
- adjustments
- expiry and low-stock alerts

### Dispatch and Delivery modules
- trip creation
- loading sheets
- challans
- stop updates
- proof of delivery
- reconciliation

### Sales Invoices module
- invoice generation from delivery/order
- assisted invoice creation by admin
- retailer invoice visibility

### Payments module
- collection entry
- allocations
- outstanding tracking
- retailer and supplier financial views

### Accounting module
- journals
- ledgers
- day closing
- P&L
- balance sheet
- GST summary

## P0 build order
1. auth
2. retailers
3. products
4. delivery-cycles
5. sales-orders
6. demand-consolidations
7. purchase-orders
8. goods-receipts
9. inventory
10. dispatch
11. delivery
12. sales-invoices
13. payments
14. dashboard

## What has been scaffolded
This workspace now includes:
- `backend/src/app.module.ts`
- `backend/src/main.ts`
- `backend/src/prisma/*`
- placeholder NestJS module files for all major ERP domains
- common auth/role/audit placeholders
- config placeholders

This gives you a clean enterprise starting structure before generating DTOs, controllers, services, and business logic.

## Recommended next step
After module structure, the best next step is:
1. generate DTO structure
2. generate controller/service skeletons for P0 modules
3. start implementing auth + retailers + sales-orders + demand-consolidations
