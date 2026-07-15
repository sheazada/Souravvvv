# Protected Admin Route Registration

This document explains how to add a new **permission-aware admin section** in the frontend.

It applies to pages inside:
- `src/app/(admin)/app/**`

The current frontend architecture centralizes:
- route permissions
- sidebar visibility
- topbar shortcut visibility
- loading/unauthorized guard copy
- main page header titles/descriptions
- detail page title prefixes/descriptions
- topbar labels/styles through central shortcut metadata
- dashboard/report subarea metadata when needed

All of that is driven from one registry.

---

## 1. Add or reuse a permission key

File:
- `src/config/permissions.ts`

Example:
```ts
export const permissions = {
  ...
  claimsManage: 'claims.manage',
} as const;
```

Use an existing permission if the backend already exposes a suitable one.

---

## 2. Register the section in the admin route registry

File:
- `src/config/admin-route-permissions.ts`

Add a new route key entry to `ADMIN_ROUTE_REGISTRY`.

Example:
```ts
claims: {
  permissions: [permissions.claimsManage],
  title: 'Claims',
  pageTitle: 'Claims',
  pageDescription: 'Review retailer and supplier claims, resolutions, and settlement impact.',
  detailTitlePrefix: 'Claim',
  detailPageDescription: 'Inspect claim amount, related documents, and approval trail.',
  loadingDescription:
    'Checking permissions and redirecting if claims access is not allowed.',
  unauthorizedDescription:
    'You need claims permissions to open claim review and settlement screens.',
},
```

### Registry field meaning
- `permissions`: required permission codes
- `title`: section title used in guard states
- `pageTitle`: main list/index page title
- `pageDescription`: main list/index page description
- `detailPageTitle`: optional fixed detail title
- `detailTitlePrefix`: optional prefix for dynamic detail titles
- `detailPageDescription`: optional detail page description
- `loadingDescription`: shown while guard is checking access
- `unauthorizedDescription`: shown on access denied page

---

## 3. Add the sidebar nav item

File:
- `src/config/navigation.ts`

Example:
```ts
{
  label: 'Claims',
  href: '/app/claims',
  requiredPermissions: getAdminRoutePermissions('claims'),
},
```

This ensures the sidebar hides the item when permission is missing.

---

## 4. Optional: register dashboard/report subareas

If a single page contains multiple protected or centrally-described sections, add extra route keys for those subareas too.

Example:
```ts
dashboardMonthlySales: {
  permissions: [permissions.dashboardRead],
  title: 'Dashboard',
  pageTitle: 'Monthly Sales',
  pageDescription: 'Track month-wise sales movement across the business.',
  loadingDescription:
    'Checking permissions and redirecting if dashboard access is not allowed.',
  unauthorizedDescription:
    'You need dashboard permissions to review monthly sales trends.',
},
```

This is useful when you want central control over:
- section headings inside complex pages
- future drill-down routes
- tooltip/help text consistency

---

## 5. Add a guarded layout for the section

Create a section layout file under the route folder.

Example file:
- `src/app/(admin)/app/claims/layout.tsx`

Example:
```tsx
'use client';

import { AccessDeniedPanel } from '@/components/auth/access-denied-panel';
import { AdminRouteGuard } from '@/components/auth/admin-route-guard';
import { PageHeader } from '@/components/ui/page-header';
import {
  getAdminRouteMeta,
  getAdminRoutePermissions,
} from '@/config/admin-route-permissions';

export default function ClaimsSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const routeMeta = getAdminRouteMeta('claims');

  return (
    <AdminRouteGuard
      requiredPermissions={getAdminRoutePermissions('claims')}
      loadingFallback={
        <div>
          <PageHeader title={routeMeta.title} description={routeMeta.loadingDescription} />
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
            Redirecting...
          </div>
        </div>
      }
      unauthorizedFallback={
        <div>
          <PageHeader title={routeMeta.title} description={routeMeta.unauthorizedDescription} />
          <AccessDeniedPanel />
        </div>
      }
    >
      {children}
    </AdminRouteGuard>
  );
}
```

This protects:
- list page
- detail page
- all nested pages under that section

---

## 6. Wire the main page header from the registry

In the section’s main view or page, use `getAdminRouteMeta(...)`.

Example:
```tsx
import { getAdminRouteMeta } from '@/config/admin-route-permissions';

export function ClaimsListView() {
  const routeMeta = getAdminRouteMeta('claims');

  return (
    <div>
      <PageHeader
        title={routeMeta.pageTitle}
        description={routeMeta.pageDescription}
      />
      ...
    </div>
  );
}
```

---

## 7. Wire detail page titles consistently

Use the shared helper:
- `src/lib/utils/title.ts`

Example:
```tsx
import { buildDetailTitle } from '@/lib/utils/title';
import { getAdminRouteMeta } from '@/config/admin-route-permissions';

const routeMeta = getAdminRouteMeta('claims');

<PageHeader
  title={buildDetailTitle(routeMeta.detailTitlePrefix ?? routeMeta.pageTitle, claim.claimNo)}
  description={routeMeta.detailPageDescription}
/>
```

Use `detailPageTitle` when the detail title should be fixed instead of dynamic.

---

## 8. Add a topbar shortcut if needed

File:
- `src/config/admin-route-permissions.ts`

Add to `ADMIN_TOPBAR_SHORTCUTS`:
```ts
{
  href: '/app/claims',
  routeKey: 'claims',
  variant: 'default',
}
```

Topbar metadata is then derived centrally from the route key:
- label comes from `pageTitle`
- styles come from `variant`
- visibility comes from `canAccessAdminRoute(...)`

Helpers involved:
- `canAccessAdminRoute(...)`
- `getAdminTopbarShortcutMeta(...)`

No extra topbar logic should be needed in the component.

---

## 9. Use centralized helpers only

Prefer these helpers instead of hardcoding permission checks:
- `getAdminRoutePermissions(routeKey)`
- `getAdminRouteMeta(routeKey)`
- `canAccessAdminRoute(user, routeKey)`
- `buildDetailTitle(prefix, value)`

This keeps:
- sidebar
- topbar
- route guards
- page headers
- detail headers
- subarea headings

all aligned.

---

## 10. Recommended checklist

When adding a new protected admin section, verify:

- [ ] permission exists in `src/config/permissions.ts`
- [ ] section registered in `src/config/admin-route-permissions.ts`
- [ ] sidebar item uses `getAdminRoutePermissions(...)`
- [ ] section `layout.tsx` uses `AdminRouteGuard`
- [ ] main page header uses `getAdminRouteMeta(...)`
- [ ] detail page/view uses `buildDetailTitle(...)` if dynamic
- [ ] optional topbar shortcut is registered centrally
- [ ] optional dashboard/report subarea key is registered if needed
- [ ] unauthorized users cannot see nav item
- [ ] unauthorized direct URL access shows access denied page

---

## 11. Current examples to follow

Good reference implementations:
- Finance Settings
  - `src/features/settings/components/retailer-note-thresholds-view.tsx`
- Accounting section guard
  - `src/app/(admin)/app/accounting/layout.tsx`
- Dispatch section guard
  - `src/app/(admin)/app/dispatch-trips/layout.tsx`
- Sales invoice detail title
  - `src/features/sales-invoices/components/sales-invoice-detail-view.tsx`
- Central registry
  - `src/config/admin-route-permissions.ts`
- Centralized topbar shortcut metadata
  - `src/components/navigation/topbar.tsx`
- Dashboard subarea metadata usage
  - `src/features/dashboard/components/admin-dashboard-view.tsx`

---

## 12. Known limitation

The frontend now has strong UI-level permission handling, but final security still depends on backend authorization.

Always ensure the backend endpoint also enforces the same permission/business rule.
