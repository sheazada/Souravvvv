import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/feedback/empty-state';

export default function Page() {
  return (
    <div>
      <PageHeader title="Reset Password" description="Password reset form." />
      <EmptyState title="Reset Password" description="Connect this page to the mapped backend APIs from the architecture document." />
    </div>
  );
}
