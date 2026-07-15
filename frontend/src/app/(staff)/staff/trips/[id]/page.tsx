import { StaffTripDetailView } from '@/features/staff/components/staff-trip-detail-view';

export default function StaffTripDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <StaffTripDetailView id={params.id} />;
}
