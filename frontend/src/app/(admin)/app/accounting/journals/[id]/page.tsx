import { JournalDetailView } from '@/features/accounting/components/journal-detail-view';

export default async function JournalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <JournalDetailView id={id} />;
}
