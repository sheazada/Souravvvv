import { ProductDetailView } from '@/features/products/components/product-detail-view';

export default function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <ProductDetailView id={params.id} />;
}
