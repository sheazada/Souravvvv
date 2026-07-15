import { RetailerDetailView } from '@/features/retailers/components/retailer-detail-view';

export default function RetailerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <RetailerDetailView id={params.id} />;
}
