import { DeliveryStopDetailView } from '@/features/delivery/components/delivery-stop-detail-view';

export default function DeliveryStopDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <DeliveryStopDetailView id={params.id} />;
}
