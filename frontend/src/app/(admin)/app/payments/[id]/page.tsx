import { PaymentReceiptDetailView } from '@/features/payments/components/payment-receipt-detail-view';

export default async function PaymentReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PaymentReceiptDetailView id={id} />;
}
