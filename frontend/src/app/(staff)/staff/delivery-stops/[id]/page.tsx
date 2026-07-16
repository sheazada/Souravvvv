import { StaffDeliveryStopView } from '@/features/staff/components/staff-delivery-stop-view';

export default async function StaffDeliveryStopPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StaffDeliveryStopView id={id} />;
}
