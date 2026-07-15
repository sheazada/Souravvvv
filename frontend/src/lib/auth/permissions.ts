import {
  getAdminRoutePermissions,
  type AdminProtectedRouteKey,
} from '@/config/admin-route-permissions';
import type { CurrentUser } from '@/types/auth';

export function hasAnyPermission(user: CurrentUser | null, requiredPermissions: readonly string[]) {
  if (!requiredPermissions.length) {
    return true;
  }

  if (!user) {
    return false;
  }

  if (user.roles.includes('OWNER')) {
    return true;
  }

  return requiredPermissions.some((permission) => user.permissions.includes(permission));
}

export function canAccessAdminRoute(
  user: CurrentUser | null,
  routeKey: AdminProtectedRouteKey,
) {
  return hasAnyPermission(user, getAdminRoutePermissions(routeKey));
}
