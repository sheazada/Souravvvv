import { DispatchTripDetailView } from '@/features/dispatch/components/dispatch-trip-detail-view';

export default async function DispatchTripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DispatchTripDetailView id={id} />;
}
