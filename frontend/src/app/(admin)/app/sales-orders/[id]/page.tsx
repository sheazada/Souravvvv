import { SalesOrderDetailView } from '@/features/sales-orders/components/sales-order-detail-view';

export default async function SalesOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SalesOrderDetailView id={id} />;
}
