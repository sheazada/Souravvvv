'use client';

import { InstallPrompt } from './install-prompt';
import { NetworkStatusBar } from './network-status-bar';
import { PwaRegister } from './pwa-register';

export function OfflineShell() {
  return (
    <>
      <PwaRegister />
      <NetworkStatusBar />
      <InstallPrompt />
    </>
  );
}
