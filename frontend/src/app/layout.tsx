import './globals.css';
import type { Metadata, Viewport } from 'next';
import { OfflineShell } from '@/components/pwa/offline-shell';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Dairy Distributor ERP',
  description: 'Mobile-first ERP for dairy distribution operations.',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#06b6d4',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <OfflineShell />
          {children}
        </Providers>
      </body>
    </html>
  );
}
