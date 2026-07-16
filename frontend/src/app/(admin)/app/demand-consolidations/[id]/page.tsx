import { DemandConsolidationDetailView } from '@/features/demand-consolidations/components/demand-consolidation-detail-view';

export default async function DemandConsolidationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DemandConsolidationDetailView id={id} />;
}
