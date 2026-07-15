import { PortalOrderDetailView } from '@/features/portal/components/portal-order-detail-view';

export default function PortalOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <PortalOrderDetailView id={params.id} />;
}
