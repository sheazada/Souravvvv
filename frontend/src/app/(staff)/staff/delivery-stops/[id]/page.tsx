import { StaffDeliveryStopView } from '@/features/staff/components/staff-delivery-stop-view';

export default function StaffDeliveryStopPage({
  params,
}: {
  params: { id: string };
}) {
  return <StaffDeliveryStopView id={params.id} />;
}
