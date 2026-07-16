import { GoodsReceiptDetailView } from '@/features/goods-receipts/components/goods-receipt-detail-view';

export default async function GoodsReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GoodsReceiptDetailView id={id} />;
}
