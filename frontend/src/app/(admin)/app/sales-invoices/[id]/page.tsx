import { SalesInvoiceDetailView } from '@/features/sales-invoices/components/sales-invoice-detail-view';

export default function SalesInvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <SalesInvoiceDetailView id={params.id} />;
}
