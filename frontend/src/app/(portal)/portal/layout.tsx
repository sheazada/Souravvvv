import { AppShell } from '@/components/layouts/app-shell';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <AppShell area="portal" title="Retailer Portal">{children}</AppShell>;
}
