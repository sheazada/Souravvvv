import { StaffTripDetailView } from '@/features/staff/components/staff-trip-detail-view';

export default async function StaffTripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StaffTripDetailView id={id} />;
}
