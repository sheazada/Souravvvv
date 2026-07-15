'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);

  if (!promptEvent || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
      <div className="text-sm font-semibold text-slate-950">Install Dairy ERP</div>
      <p className="mt-1 text-sm text-slate-600">
        Add the ERP to the home screen for quicker access and better app-like behavior.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={async () => {
            await promptEvent.prompt();
            await promptEvent.userChoice;
            setPromptEvent(null);
          }}
          className="rounded-xl bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950"
        >
          Install
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
        >
          Later
        </button>
      </div>
    </div>
  );
}
