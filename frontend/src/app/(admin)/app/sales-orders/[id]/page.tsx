import { SalesOrderDetailView } from '@/features/sales-orders/components/sales-order-detail-view';

export default function SalesOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <SalesOrderDetailView id={params.id} />;
}
