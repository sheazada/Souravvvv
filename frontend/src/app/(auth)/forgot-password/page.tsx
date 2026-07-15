import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/feedback/empty-state';

export default function Page() {
  return (
    <div>
      <PageHeader title="Forgot Password" description="Password recovery request form." />
      <EmptyState title="Forgot Password" description="Connect this page to the mapped backend APIs from the architecture document." />
    </div>
  );
}
