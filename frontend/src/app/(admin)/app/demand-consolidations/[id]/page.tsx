import { DemandConsolidationDetailView } from '@/features/demand-consolidations/components/demand-consolidation-detail-view';

export default function DemandConsolidationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <DemandConsolidationDetailView id={params.id} />;
}
