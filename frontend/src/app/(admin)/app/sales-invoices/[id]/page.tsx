import { SalesInvoiceDetailView } from '@/features/sales-invoices/components/sales-invoice-detail-view';

export default async function SalesInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SalesInvoiceDetailView id={id} />;
}
