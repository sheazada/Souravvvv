# Next.js Frontend Architecture

## Stack
- Next.js App Router
- TypeScript
- Tailwind CSS
- React Query for server state
- Zustand for small local UI state
- Zod + React Hook Form for forms

## Folder strategy

### `src/app`
Route groups and layouts:
- `(auth)` for login/recovery
- `(admin)/app` for backoffice
- `(portal)/portal` for retailer portal
- `(staff)/staff` for delivery/staff portal

### `src/features`
Domain-specific API bindings, hooks, and feature-local utilities.
Each module mirrors a backend domain:
- auth
- dashboard
- retailers
- products
- sales-orders
- demand-consolidations
- purchase-orders
- goods-receipts
- inventory
- dispatch
- delivery
- sales-invoices
- payments
- accounting
- reports

### `src/components`
Reusable UI and shell components:
- layouts
- navigation
- ui
- feedback

### `src/lib`
Cross-cutting utilities:
- API client
- auth helpers
- query provider
- common utils

### `src/config`
App routes, menu configuration, role-based navigation.

See also:
- `PROTECTED_ADMIN_ROUTE_REGISTRATION.md` for the protected admin route registry, permission wiring, route guards, and page metadata pattern.
- `PORTAL_STAFF_PROTECTED_ROUTE_PATTERNS.md` for retailer portal and staff/driver protected route conventions.

### `src/types`
Shared frontend types for auth, API responses, and domain models.

## Role route groups
- admin/backoffice: `/app/*`
- retailer: `/portal/*`
- staff/driver: `/staff/*`

## Auth approach
- cookie-based access token for middleware route protection
- client helpers for reading and clearing auth state
- role-aware redirect after login

## Recommended frontend implementation order
1. auth + shell
2. dashboard
3. retailer management
4. products
5. sales orders
6. demand consolidations
7. purchase orders / GRN / inventory
8. dispatch / delivery
9. invoices / payments / accounting
10. reports
