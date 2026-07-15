import { JournalDetailView } from '@/features/accounting/components/journal-detail-view';

export default function JournalDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <JournalDetailView id={params.id} />;
}
