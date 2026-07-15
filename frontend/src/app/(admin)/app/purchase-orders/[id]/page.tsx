import { PurchaseOrderDetailView } from '@/features/purchase-orders/components/purchase-order-detail-view';

export default function PurchaseOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <PurchaseOrderDetailView id={params.id} />;
}
