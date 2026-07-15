import type { CurrentUser } from '@/types/auth';

const ACCESS_COOKIE = 'dd_access_token';
const ROLE_COOKIE = 'dd_user_role';
const USER_STORAGE_KEY = 'dd_current_user';

function setCookie(name: string, value: string, days = 7) {
  if (typeof document === 'undefined') return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
}

function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

export const tokenStore = {
  getAccessToken() {
    return getCookie(ACCESS_COOKIE);
  },
  setSession(payload: { accessToken: string; user: CurrentUser }) {
    if (typeof window === 'undefined') return;
    setCookie(ACCESS_COOKIE, payload.accessToken, 7);
    setCookie(ROLE_COOKIE, payload.user.roles[0] ?? payload.user.userType, 7);
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(payload.user));
  },
  getStoredUser(): CurrentUser | null {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CurrentUser;
    } catch {
      return null;
    }
  },
  clear() {
    if (typeof document !== 'undefined') {
      document.cookie = `${ACCESS_COOKIE}=; Max-Age=0; path=/`;
      document.cookie = `${ROLE_COOKIE}=; Max-Age=0; path=/`;
    }
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(USER_STORAGE_KEY);
    }
  },
};
