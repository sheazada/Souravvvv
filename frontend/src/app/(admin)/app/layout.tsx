import { AppShell } from '@/components/layouts/app-shell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AppShell area="admin" title="Admin / Backoffice">{children}</AppShell>;
}
