import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/feedback/empty-state';

export default function Page() {
  return (
    <div>
      <PageHeader title="OTP Login" description="Phone-based login flow for staff, retailer, and admin users." />
      <EmptyState title="OTP Login" description="Connect this page to the mapped backend APIs from the architecture document." />
    </div>
  );
}
