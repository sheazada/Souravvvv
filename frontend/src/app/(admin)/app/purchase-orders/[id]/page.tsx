import { PurchaseOrderDetailView } from '@/features/purchase-orders/components/purchase-order-detail-view';

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PurchaseOrderDetailView id={id} />;
}
