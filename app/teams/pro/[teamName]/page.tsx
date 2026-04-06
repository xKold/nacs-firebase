import Link from 'next/link';
import { fetchProTeamData } from '@/lib/pro-team-api';
import ProOverview from '../../[teamId]/ProOverview';

export default async function ProTeamPage({
  params,
}: {
  params: Promise<{ teamName: string }>;
}) {
  const { teamName } = await params;
  const decodedName = decodeURIComponent(teamName);

  const proData = await fetchProTeamData(decodedName);

  if (!proData) {
    return (
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-surface rounded-xl border border-border p-8">
          <p className="text-live mb-4">
            No pro data found for &quot;{decodedName}&quot;.
          </p>
          <Link href="/rankings" className="text-accent hover:underline text-sm">
            &larr; Back to Rankings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      <Link href="/rankings" className="text-accent hover:underline text-sm mb-4 inline-block">
        &larr; Back to Rankings
      </Link>
      <ProOverview data={proData} />
    </div>
  );
}
