import { AppShell } from '@/components/layouts/app-shell';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <AppShell area="staff" title="Driver / Staff">{children}</AppShell>;
}
