# Retailer Portal / Staff Protected Route Patterns

This document explains the current frontend pattern for **retailer portal** and **staff/driver** protected routes.

It applies to pages inside:
- `src/app/(portal)/portal/**`
- `src/app/(staff)/staff/**`

Unlike the admin area, these sections currently rely more on:
- route-group separation
- shared auth middleware
- role-aware redirect after login
- backend authorization on `/my/*`, driver, and retailer endpoints

---

## 1. Current protection model

### Middleware-level auth gate

File:
- `middleware.ts`

The middleware protects these route prefixes:
- `/app/*`
- `/portal/*`
- `/staff/*`

If there is no access token cookie, the user is redirected to:
- `/login`

This is the first layer of protection.

### Role-aware home redirect

File:
- `src/lib/auth/redirects.ts`

Current role routing:
- retailer user → `/portal/dashboard`
- driver → `/staff/dashboard`
- otherwise → `/app/dashboard`

This controls the default landing route after login/session restore.

### Backend authorization still remains mandatory

Frontend grouping is only a UI/navigation layer.

Final access control still depends on backend rules for endpoints like:
- `/my/orders`
- `/my/invoices`
- `/my/dues`
- `/my/trips/today`
- `/my/collection-summary`
- `/my/delivery-stops/*`
- `/dashboard/retailer`
- `/dashboard/driver`

---

## 2. Route groups and layouts

### Retailer portal
Files:
- `src/app/(portal)/portal/layout.tsx`
- `src/config/navigation.ts`

Base route:
- `/portal/*`

Current portal nav:
- Dashboard
- Orders
- Invoices
- Dues
- Profile

The portal layout uses:
- `AppShell area="portal" title="Retailer Portal"`

### Staff / driver
Files:
- `src/app/(staff)/staff/layout.tsx`
- `src/config/navigation.ts`

Base route:
- `/staff/*`

Current staff nav:
- Dashboard
- Today Trips
- Collections

The staff layout uses:
- `AppShell area="staff" title="Driver / Staff"`

---

## 3. API namespace pattern

### Retailer portal APIs
File:
- `src/features/portal/api.ts`

Use retailer/self-service scoped endpoints such as:
- `/dashboard/retailer`
- `/my/orders`
- `/my/orders/:id`
- `/my/invoices`
- `/my/invoices/:id`
- `/my/dues`

Portal profile also composes:
- `/auth/me`
- `/retailers/:id`
- `/retailers/:id/ledger-summary`

### Staff APIs
File:
- `src/features/staff/api.ts`

Use staff/driver scoped endpoints such as:
- `/dashboard/driver`
- `/my/trips/today`
- `/my/trips/:id`
- `/my/trips/:id/stops`
- `/my/collection-summary`
- `/my/delivery-stops/:id/status`
- `/my/delivery-stops/:id/collections`
- `/my/delivery-stops/:id/crates`
- `/my/delivery-stops/:id/proof-of-delivery`

Staff routes also support offline queue behavior for some field actions through:
- `src/lib/offline/queue.ts`

---

## 4. When to add a new portal or staff page

### Add a retailer portal page when
- retailer should see their own history, dues, profile, invoices, or order actions
- endpoint is scoped to authenticated retailer
- page should never expose another retailer’s data in UI inputs or paths

### Add a staff page when
- delivery/driver user should act on assigned trips/stops/collections only
- endpoint is scoped to authenticated field staff
- action may need offline queue behavior for unstable network conditions

---

## 5. Recommended page pattern for retailer portal

Example file:
- `src/app/(portal)/portal/claims/page.tsx`

Example view:
```tsx
import { PortalClaimsView } from '@/features/portal/components/portal-claims-view';

export default function PortalClaimsPage() {
  return <PortalClaimsView />;
}
```

Example feature view:
```tsx
'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { PortalApi } from '@/features/portal/api';
import { useQuery } from '@tanstack/react-query';

export function PortalClaimsView() {
  const query = useQuery({
    queryKey: ['portal', 'claims'],
    queryFn: () => PortalApi.getClaims(),
  });

  if (query.isLoading) {
    return <div className="text-sm text-slate-500">Loading claims...</div>;
  }

  if (query.error || !query.data?.data) {
    return (
      <EmptyState
        title="Unable to load claims"
        description={query.error instanceof Error ? query.error.message : 'Claims unavailable'}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Claims"
        description="Review claim status and settlement notes for your retailer account."
      />
      {/* render data */}
    </div>
  );
}
```

Key rule:
- prefer `/my/*` or explicitly retailer-scoped backend APIs
- never ask retailer to provide raw retailer IDs in the UI

---

## 6. Recommended page pattern for staff/driver

Example file:
- `src/app/(staff)/staff/returns/page.tsx`

Example view:
```tsx
import { StaffReturnsView } from '@/features/staff/components/staff-returns-view';

export default function StaffReturnsPage() {
  return <StaffReturnsView />;
}
```

Example feature view:
```tsx
'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { StaffApi } from '@/features/staff/api';
import { useQuery } from '@tanstack/react-query';

export function StaffReturnsView() {
  const query = useQuery({
    queryKey: ['staff', 'returns'],
    queryFn: () => StaffApi.getReturns(),
  });

  if (query.isLoading) {
    return <div className="text-sm text-slate-500">Loading returns...</div>;
  }

  if (query.error || !query.data?.data) {
    return (
      <EmptyState
        title="Unable to load returns"
        description={query.error instanceof Error ? query.error.message : 'Returns unavailable'}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Returns"
        description="Review stop-level return activity assigned to you."
      />
      {/* render data */}
    </div>
  );
}
```

If the action is field-critical and network-sensitive, prefer the same offline-first pattern used in:
- `src/features/staff/api.ts`

---

## 7. Navigation update checklist

When adding a portal page:
- update `NAVIGATION_BY_AREA.portal` in `src/config/navigation.ts`
- add route file under `src/app/(portal)/portal/...`
- add feature API/view under `src/features/portal/...`

When adding a staff page:
- update `NAVIGATION_BY_AREA.staff` in `src/config/navigation.ts`
- add route file under `src/app/(staff)/staff/...`
- add feature API/view under `src/features/staff/...`

---

## 8. Suggested access rules

### Retailer portal
Use when the page should be visible only for retailer users.

Good examples:
- dashboard
- orders
- invoices
- dues
- profile

### Staff portal
Use when the page should be visible only for driver/field staff.

Good examples:
- today trips
- trip detail
- delivery stop execution
- collection summary

### Do not mix admin assumptions
Avoid:
- admin-only lookup dependencies where `/my/*` data is enough
- raw UUID entry fields for retailer/staff users
- exposing unrelated organization-wide lists to portal/staff

---

## 9. If client-side role guard is needed later

Today, portal/staff rely mainly on middleware auth + backend authorization.

If you later need page-level client-side guards similar to admin, create wrappers like:
- `PortalRouteGuard`
- `StaffRouteGuard`

These should validate:
- stored user exists
- stored user role/userType matches expected portal/staff audience
- otherwise redirect to the correct home route or show an access-denied state

Do this only when you need stronger client-side UX protection than middleware + backend already provide.

---

## 10. Recommended checklist

For a new retailer portal/staff route, verify:
- [ ] route is placed in the correct route group
- [ ] nav item is added under the correct area
- [ ] API uses `/my/*` or role-scoped dashboard/driver endpoints where appropriate
- [ ] no raw org-level IDs are exposed unnecessarily in the UI
- [ ] page handles loading, empty, and error states cleanly
- [ ] backend already enforces the same access rule
- [ ] staff field mutations use offline queue if needed

---

## 11. Reference files

### Portal
- `src/app/(portal)/portal/layout.tsx`
- `src/features/portal/api.ts`
- `src/features/portal/components/retailer-dashboard-view.tsx`
- `src/features/portal/components/portal-orders-view.tsx`
- `src/features/portal/components/portal-invoices-view.tsx`
- `src/features/portal/components/portal-dues-view.tsx`

### Staff
- `src/app/(staff)/staff/layout.tsx`
- `src/features/staff/api.ts`
- `src/features/staff/components/staff-dashboard-view.tsx`
- `src/features/staff/components/staff-trips-today-view.tsx`
- `src/features/staff/components/staff-delivery-stop-view.tsx`
- `src/features/staff/components/staff-collections-view.tsx`

### Shared auth / routing
- `middleware.ts`
- `src/lib/auth/redirects.ts`
- `src/config/navigation.ts`
- `src/config/routes.ts`

---

## 12. Known limitation

Portal/staff sections are not yet centralized in a registry like the admin route registry.

That is acceptable today because these areas are simpler and role-scoped, but if portal/staff complexity grows,
consider introducing:
- centralized role route metadata
- shared client-side route guards
- route-to-capability maps similar to admin.
