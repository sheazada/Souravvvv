import { appConfig } from '@/config/app-config';
import { tokenStore } from '@/lib/auth/token-store';

export type OfflineQueueItem = {
  id: string;
  url: string;
  method: string;
  body?: string;
  headers?: Record<string, string>;
  createdAt: string;
  label?: string;
};

const STORAGE_KEY = 'dd_offline_queue';
const EVENT_NAME = 'offline-queue-updated';

function readQueue(): OfflineQueueItem[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as OfflineQueueItem[];
  } catch {
    return [];
  }
}

function writeQueue(items: OfflineQueueItem[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: items.length }));
}

export function getOfflineQueueCount() {
  return readQueue().length;
}

export function subscribeOfflineQueue(callback: (count: number) => void) {
  if (typeof window === 'undefined') return () => undefined;
  const handler = (event: Event) => {
    const custom = event as CustomEvent<number>;
    callback(custom.detail ?? getOfflineQueueCount());
  };
  window.addEventListener(EVENT_NAME, handler as EventListener);
  return () => window.removeEventListener(EVENT_NAME, handler as EventListener);
}

export function enqueueOfflineAction(item: Omit<OfflineQueueItem, 'id' | 'createdAt'>) {
  const queue = readQueue();
  const newItem: OfflineQueueItem = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...item,
  };
  queue.push(newItem);
  writeQueue(queue);
  return newItem;
}

export async function executeOrQueue<T>(item: {
  path: string;
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: Record<string, unknown>;
  label?: string;
}): Promise<{ queued: boolean; data?: T }> {
  const token = tokenStore.getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const body = item.body ? JSON.stringify(item.body) : undefined;

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    enqueueOfflineAction({
      url: `${appConfig.apiBaseUrl}${item.path}`,
      method: item.method,
      body,
      headers,
      label: item.label,
    });
    return { queued: true };
  }

  try {
    const response = await fetch(`${appConfig.apiBaseUrl}${item.path}`, {
      method: item.method,
      headers,
      body,
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    return { queued: false, data: (await response.json()) as T };
  } catch {
    enqueueOfflineAction({
      url: `${appConfig.apiBaseUrl}${item.path}`,
      method: item.method,
      body,
      headers,
      label: item.label,
    });
    return { queued: true };
  }
}

export async function flushOfflineQueue() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { flushed: 0, remaining: getOfflineQueueCount() };
  }

  const queue = readQueue();
  if (!queue.length) {
    return { flushed: 0, remaining: 0 };
  }

  const remaining: OfflineQueueItem[] = [];
  let flushed = 0;

  for (const item of queue) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body,
      });
      if (!response.ok) {
        remaining.push(item);
        continue;
      }
      flushed += 1;
    } catch {
      remaining.push(item);
    }
  }

  writeQueue(remaining);
  return { flushed, remaining: remaining.length };
}
