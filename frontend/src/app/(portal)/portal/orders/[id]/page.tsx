import { PortalOrderDetailView } from '@/features/portal/components/portal-order-detail-view';

export default async function PortalOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PortalOrderDetailView id={id} />;
}
