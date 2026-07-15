import { StaffTripStopsView } from '@/features/staff/components/staff-trip-stops-view';

export default function StaffTripStopsPage({
  params,
}: {
  params: { id: string };
}) {
  return <StaffTripStopsView id={params.id} />;
}
