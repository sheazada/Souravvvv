import { appConfig } from '@/config/app-config';
import { tokenStore } from '@/lib/auth/token-store';

export type QueryValue = string | number | boolean | undefined | null;

export function buildQueryString(query?: Record<string, QueryValue>) {
  if (!query) return '';
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });
  const built = params.toString();
  return built ? `?${built}` : '';
}

export async function apiClient<T>(path: string, init?: RequestInit): Promise<T> {
  const token = tokenStore.getAccessToken();
  const response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const body = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof body === 'string'
        ? body
        : body?.message ?? body?.error?.message ?? `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return body as T;
}
