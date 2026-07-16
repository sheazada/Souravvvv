import { StaffTripStopsView } from '@/features/staff/components/staff-trip-stops-view';

export default async function StaffTripStopsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StaffTripStopsView id={id} />;
}
