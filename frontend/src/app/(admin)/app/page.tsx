import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/feedback/empty-state';

export default function Page() {
  return (
    <div>
      <PageHeader title="Admin Home" description="Use this route as a jump page or redirect to dashboard." />
      <EmptyState title="Admin Home" description="Connect this page to the mapped backend APIs from the architecture document." />
    </div>
  );
}
