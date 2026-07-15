import { PortalInvoiceDetailView } from '@/features/portal/components/portal-invoice-detail-view';

export default function PortalInvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <PortalInvoiceDetailView id={params.id} />;
}
