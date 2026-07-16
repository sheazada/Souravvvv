import { PortalInvoiceDetailView } from '@/features/portal/components/portal-invoice-detail-view';

export default async function PortalInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PortalInvoiceDetailView id={id} />;
}
