# Frontend API Wiring — Phase 1

## Implemented first connected pages

### 1. Login page
- Uses real backend API: `POST /auth/login`
- Stores access token in cookie
- Stores user snapshot in local storage
- Redirects by role:
  - admin/owner/accounting/ops → `/app/dashboard`
  - retailer → `/portal/dashboard`
  - driver/staff → `/staff/dashboard`

### 2. Admin dashboard page
- Uses real backend APIs:
  - `GET /dashboard/summary`
  - `GET /dashboard/charts/monthly-sales`
  - `GET /dashboard/charts/top-products`
  - `GET /dashboard/charts/top-retailers`
  - `GET /dashboard/charts/delivery-performance`
  - `GET /dashboard/charts/staff-performance`
- Displays KPIs and list-based chart summaries

### 3. Retailer list page
- Uses real backend API: `GET /retailers`
- Supports search and filter controls
- Uses real backend mutation: `PATCH /retailers/:id/ordering-mode`
- Demonstrates assisted/self-service mode toggling from frontend

## Shared frontend wiring added
- API client now sends bearer token from cookie
- query-string builder added
- token/session helper added
- auth redirect helper added
- typed dashboard and retailer models added

## Next recommended frontend wiring
1. retailer detail page
2. sales order list + assisted order create flow
3. demand consolidation list/detail
4. purchase order / GRN / inventory pages
