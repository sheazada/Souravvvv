import { PaymentReceiptDetailView } from '@/features/payments/components/payment-receipt-detail-view';

export default function PaymentReceiptDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <PaymentReceiptDetailView id={params.id} />;
}
