import { RetailerDetailView } from '@/features/retailers/components/retailer-detail-view';

export default async function RetailerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RetailerDetailView id={id} />;
}
