import { DeliveryStopDetailView } from '@/features/delivery/components/delivery-stop-detail-view';

export default async function DeliveryStopDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DeliveryStopDetailView id={id} />;
}
