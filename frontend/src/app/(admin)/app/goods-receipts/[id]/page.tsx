import { GoodsReceiptDetailView } from '@/features/goods-receipts/components/goods-receipt-detail-view';

export default function GoodsReceiptDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <GoodsReceiptDetailView id={params.id} />;
}
