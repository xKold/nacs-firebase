import Link from 'next/link';
import {
  PSBracketMatch,
  PSTournament,
  TierBadge,
  parseBracket,
} from '../../components/bracket';
import SerieTabs, { StageData } from './SerieTabs';

interface SerieTournamentListItem {
  id: number;
  name: string;
  tier: string;
  begin_at: string | null;
  end_at: string | null;
}

async function fetchSerieData(serieId: string) {
  const token = process.env.PANDASCORE_API_KEY;
  if (!token) return null;

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };

  const fetchJson = async (url: string) => {
    try {
      const res = await fetch(url, { headers, next: { revalidate: 60 } });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  };

  // Fetch all tournaments in this serie
  const tournamentsList = (await fetchJson(
    `https://api.pandascore.co/series/${serieId}/tournaments?per_page=25`
  )) as SerieTournamentListItem[] | null;

  if (!tournamentsList || tournamentsList.length === 0) return null;

  // Fetch details + brackets for each tournament in parallel
  const stagePromises = tournamentsList.map(async (t) => {
    const [detail, brackets] = await Promise.all([
      fetchJson(`https://api.pandascore.co/tournaments/${t.id}`) as Promise<PSTournament | null>,
      fetchJson(`https://api.pandascore.co/tournaments/${t.id}/brackets`) as Promise<PSBracketMatch[] | null>,
    ]);
    return { detail, brackets };
  });

  const stageResults = await Promise.all(stagePromises);

  const stages: StageData[] = [];
  for (const result of stageResults) {
    if (!result.detail) continue;
    const tournament = result.detail;
    const bracketMatches = result.brackets;
    const bracket = bracketMatches ? parseBracket(bracketMatches) : null;
    stages.push({
      tournament,
      matches: tournament.matches || [],
      bracket,
    });
  }

  if (stages.length === 0) return null;

  return { stages, tournamentsList };
}

export default async function Page({ params }: { params: Promise<{ serieId: string }> }) {
  const { serieId } = await params;
  const data = await fetchSerieData(serieId);

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto px-4">
        <div className="bg-surface rounded-xl border border-border p-8">
          <p className="text-live">Serie not found.</p>
          <Link href="/" className="text-accent hover:underline mt-4 inline-block">
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const { stages } = data;
  const firstStage = stages[0];
  const league = firstStage.tournament.league;
  const serie = firstStage.tournament.serie;
  const tier = firstStage.tournament.tier;

  const serieName = serie?.full_name || serie?.name || '';
  const title = serieName ? `${league.name}: ${serieName}` : league.name;

  // Date range across all stages
  const beginDates = stages
    .map((s) => s.tournament.begin_at)
    .filter(Boolean) as string[];
  const endDates = stages
    .map((s) => s.tournament.end_at)
    .filter(Boolean) as string[];
  const startDate = beginDates.length > 0 ? beginDates.sort()[0] : null;
  const endDate = endDates.length > 0 ? endDates.sort().reverse()[0] : null;

  const dateRange = [
    startDate
      ? new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : null,
    endDate
      ? new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null,
  ]
    .filter(Boolean)
    .join(' — ');

  const totalMatches = stages.reduce((sum, s) => sum + s.matches.length, 0);

  return (
    <div className="max-w-7xl mx-auto px-4">
      <Link href="/" className="text-accent hover:underline text-sm mb-4 inline-block">
        &larr; Back to Events
      </Link>

      {/* Serie Header */}
      <div className="bg-surface rounded-xl border border-border p-6 mb-6">
        <div className="flex items-center gap-4">
          {league.image_url && (
            <img
              src={league.image_url}
              alt={league.name}
              className="w-14 h-14 object-contain"
            />
          )}
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">{title}</h1>
              <TierBadge tier={tier} />
            </div>
            <div className="flex items-center gap-3 text-sm text-text-muted">
              <span>{stages.length} stages</span>
              {dateRange && (
                <>
                  <span className="text-border">|</span>
                  <span suppressHydrationWarning>{dateRange}</span>
                </>
              )}
              <span className="text-border">|</span>
              <span>{totalMatches} matches</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + Content */}
      <SerieTabs stages={stages} />
    </div>
  );
}
