'use client';

import { flushOfflineQueue, getOfflineQueueCount, subscribeOfflineQueue } from '@/lib/offline/queue';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useEffect, useState } from 'react';

export function NetworkStatusBar() {
  const isOnline = useNetworkStatus();
  const [queueCount, setQueueCount] = useState(getOfflineQueueCount());
  const [flushMessage, setFlushMessage] = useState<string | null>(null);

  useEffect(() => subscribeOfflineQueue(setQueueCount), []);

  useEffect(() => {
    if (!isOnline) return;
    flushOfflineQueue().then((result) => {
      if (result.flushed > 0) {
        setFlushMessage(`${result.flushed} offline action(s) synced successfully.`);
        setTimeout(() => setFlushMessage(null), 4000);
      }
    });
  }, [isOnline]);

  if (isOnline && queueCount === 0 && !flushMessage) return null;

  return (
    <div className={`border-b px-4 py-2 text-sm ${isOnline ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
      {isOnline
        ? flushMessage ?? `Online. ${queueCount} queued action(s) remaining.`
        : `Offline mode active. ${queueCount} action(s) will sync automatically when connection returns.`}
    </div>
  );
}
