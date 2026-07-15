import { DispatchTripDetailView } from '@/features/dispatch/components/dispatch-trip-detail-view';

export default function DispatchTripDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <DispatchTripDetailView id={params.id} />;
}
