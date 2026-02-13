import Link from 'next/link';
import {
  PSTeam,
  PSMatch,
  PSBracketMatch,
  PSTournament,
  parseBracket,
  TierBadge,
  BracketSection,
  ListMatchCard,
  MatchListSectionHeader,
} from '../components/bracket';

// ─── Data Fetching ───────────────────────────────────────────────────

async function fetchTournamentData(tournamentId: string) {
  const token = process.env.PANDASCORE_API_KEY;
  if (!token) return null;

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };

  try {
    const [tournamentRes, bracketsRes] = await Promise.all([
      fetch(`https://api.pandascore.co/tournaments/${tournamentId}`, {
        headers,
        next: { revalidate: 60 },
      }),
      fetch(`https://api.pandascore.co/tournaments/${tournamentId}/brackets`, {
        headers,
        next: { revalidate: 60 },
      }),
    ]);

    if (!tournamentRes.ok) return null;
    const tournament = (await tournamentRes.json()) as PSTournament;

    let bracketMatches: PSBracketMatch[] | null = null;
    if (bracketsRes.ok) {
      bracketMatches = (await bracketsRes.json()) as PSBracketMatch[];
    }

    return { tournament, matches: tournament.matches || [], bracketMatches };
  } catch {
    return null;
  }
}

// ─── Page ────────────────────────────────────────────────────────────

export default async function Page({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  const data = await fetchTournamentData(tournamentId);

  if (!data || !data.tournament) {
    return (
      <div className="max-w-5xl mx-auto px-4">
        <div className="bg-surface rounded-xl border border-border p-8">
          <p className="text-live">Tournament not found.</p>
          <Link href="/" className="text-accent hover:underline mt-4 inline-block">
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const { tournament, matches, bracketMatches } = data;

  const teamsMap = new Map<number, PSTeam>();
  for (const team of tournament.teams || []) {
    teamsMap.set(team.id, team);
  }

  const serieName = tournament.serie?.full_name || tournament.serie?.name || '';
  const title = serieName
    ? `${tournament.league.name}: ${serieName}`
    : `${tournament.league.name} - ${tournament.name}`;

  const dateRange = [
    tournament.begin_at
      ? new Date(tournament.begin_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : null,
    tournament.end_at
      ? new Date(tournament.end_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null,
  ]
    .filter(Boolean)
    .join(' — ');

  const bracket = bracketMatches ? parseBracket(bracketMatches) : null;
  const hasBracket = bracket && (bracket.upperBracket.length > 0 || bracket.lowerBracket.length > 0 || bracket.grandFinal);

  const live = matches.filter((m) => m.status === 'running');
  const upcoming = matches.filter((m) => m.status === 'not_started');
  const finished = matches.filter((m) => m.status === 'finished' || m.status === 'canceled');

  return (
    <div className="max-w-7xl mx-auto px-4">
      <Link href="/" className="text-accent hover:underline text-sm mb-4 inline-block">
        &larr; Back to Events
      </Link>

      {/* Tournament Header */}
      <div className="bg-surface rounded-xl border border-border p-6 mb-6">
        <div className="flex items-center gap-4">
          {tournament.league.image_url && (
            <img
              src={tournament.league.image_url}
              alt={tournament.league.name}
              className="w-14 h-14 object-contain"
            />
          )}
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">{title}</h1>
              <TierBadge tier={tournament.tier} />
            </div>
            <div className="flex items-center gap-3 text-sm text-text-muted">
              <span>{tournament.name}</span>
              {dateRange && (
                <>
                  <span className="text-border">|</span>
                  <span suppressHydrationWarning>{dateRange}</span>
                </>
              )}
              <span className="text-border">|</span>
              <span>{matches.length} matches</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bracket View */}
      {hasBracket ? (
        <div className="bg-surface rounded-xl border border-border p-6">
          {bracket.upperBracket.length > 0 && (
            <BracketSection
              title={bracket.lowerBracket.length > 0 ? 'Upper Bracket' : 'Bracket'}
              rounds={
                bracket.grandFinal
                  ? [...bracket.upperBracket, { label: 'Grand Final', matches: [bracket.grandFinal] }]
                  : bracket.upperBracket
              }
            />
          )}

          {bracket.lowerBracket.length > 0 && (
            <BracketSection title="Lower Bracket" rounds={bracket.lowerBracket} />
          )}
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-border p-6">
          {matches.length === 0 ? (
            <p className="text-text-muted text-center py-8">No matches scheduled yet.</p>
          ) : (
            <>
              <MatchListSectionHeader
                title="Live Now"
                count={live.length}
                icon={
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-live/20">
                    <span className="w-2 h-2 rounded-full bg-live animate-pulse" />
                  </span>
                }
              />
              {live.length > 0 && (
                <div className="flex flex-col gap-2 mb-2">
                  {live.map((m) => (
                    <ListMatchCard key={m.id} match={m} teams={teamsMap} />
                  ))}
                </div>
              )}

              <MatchListSectionHeader
                title="Upcoming"
                count={upcoming.length}
                icon={
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-warning/20">
                    <span className="w-2 h-2 rounded-full bg-warning" />
                  </span>
                }
              />
              {upcoming.length > 0 && (
                <div className="flex flex-col gap-2 mb-2">
                  {upcoming.map((m) => (
                    <ListMatchCard key={m.id} match={m} teams={teamsMap} />
                  ))}
                </div>
              )}

              <MatchListSectionHeader
                title="Completed"
                count={finished.length}
                icon={
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-text-muted/20">
                    <span className="w-2 h-2 rounded-full bg-text-muted" />
                  </span>
                }
              />
              {finished.length > 0 && (
                <div className="flex flex-col gap-2">
                  {finished.map((m) => (
                    <ListMatchCard key={m.id} match={m} teams={teamsMap} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
