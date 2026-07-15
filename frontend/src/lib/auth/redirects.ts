import type { CurrentUser } from '@/types/auth';

export function getHomeRouteForUser(user: CurrentUser) {
  if (user.roles.includes('RETAILER') || user.userType === 'retailer_user') {
    return '/portal/dashboard';
  }

  if (user.roles.includes('DRIVER')) {
    return '/staff/dashboard';
  }

  return '/app/dashboard';
}
