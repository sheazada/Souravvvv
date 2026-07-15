import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { getAdminRouteMeta } from '@/config/admin-route-permissions';

export default function Page() {
  const routeMeta = getAdminRouteMeta('salesOrders');

  return (
    <div>
      <PageHeader title={routeMeta.pageTitle} description={routeMeta.pageDescription} />
      <EmptyState title={routeMeta.pageTitle} description="Connect this page to the mapped backend APIs from the architecture document." />
    </div>
  );
}
