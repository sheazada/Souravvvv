import './globals.css';
import { OfflineShell } from '@/components/pwa/offline-shell';
import { Providers } from './providers';

export const metadata = {
  title: 'Dairy Distributor ERP',
  description: 'Mobile-first ERP for dairy distribution operations.',
  manifest: '/manifest.webmanifest',
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
