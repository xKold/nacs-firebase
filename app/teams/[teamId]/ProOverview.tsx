import Link from 'next/link';
import type { ProTeamData, PSMatchResult, GridSeries, TournamentStanding } from '@/lib/pro-team-api';

function CountryFlag({ nationality }: { nationality: string | null }) {
  if (!nationality) return null;
  const code = nationality.toLowerCase().slice(0, 2);
  return (
    <img
      src={`https://flagcdn.com/16x12/${code}.png`}
      alt={nationality}
      className="w-4 h-3 object-cover rounded-[1px] inline-block"
      loading="lazy"
    />
  );
}

function getMatchTeamScore(match: PSMatchResult, teamId: number) {
  return match.results.find((r) => r.team_id === teamId)?.score ?? 0;
}

function getOpponent(match: PSMatchResult, teamId: number) {
  return match.opponents.find((o) => o.opponent.id !== teamId)?.opponent ?? null;
}

/** Check if a Grid series is already covered by a PandaScore match (same opponent + date) */
function isGridSeriesDuplicate(series: GridSeries, psMatches: PSMatchResult[], psTeamId: number): boolean {
  const seriesDate = series.startTimeScheduled ? new Date(series.startTimeScheduled).toDateString() : null;
  if (!seriesDate) return false;

  const seriesOpponents = series.teams
    .map((t) => t.baseInfo.name.toLowerCase())
    .filter(Boolean);

  return psMatches.some((m) => {
    const matchDate = (m.scheduled_at || m.begin_at) ? new Date(m.scheduled_at || m.begin_at!).toDateString() : null;
    if (matchDate !== seriesDate) return false;
    const opp = getOpponent(m, psTeamId);
    if (!opp) return false;
    return seriesOpponents.some(
      (name) => name === opp.name.toLowerCase() || name.includes(opp.name.toLowerCase()) || opp.name.toLowerCase().includes(name)
    );
  });
}

/** Build full tournament display name from PandaScore league/serie/tournament */
function buildTournamentName(match: PSMatchResult): string {
  const serieName = match.serie?.full_name || match.serie?.name;
  const tournamentName = match.tournament?.name;
  const leagueName = match.league?.name;

  // serie.full_name is usually the most complete (e.g. "ESL Pro League Season 20")
  if (serieName && tournamentName && tournamentName !== serieName) {
    // Avoid duplicating if tournament name is just "Playoffs" etc.
    return `${serieName} - ${tournamentName}`;
  }
  if (serieName) return serieName;
  if (tournamentName && leagueName && tournamentName !== leagueName) {
    return `${leagueName}: ${tournamentName}`;
  }
  return tournamentName || leagueName || 'Unknown Event';
}

interface TournamentEntry {
  displayName: string;
  tournamentId: number;
  logoUrl: string | null;
  standing: TournamentStanding | null;
}

export default function ProOverview({ data }: { data: ProTeamData }) {
  const { psTeam, psMatches, gridTeam, gridSeries, tournamentStandings } = data;
  const teamId = psTeam?.id ?? 0;

  // Separate upcoming vs completed PandaScore matches
  const upcoming = psMatches.filter((m) => m.status === 'not_started');
  const live = psMatches.filter((m) => m.status === 'running');
  const completed = psMatches.filter((m) => m.status === 'finished' || m.status === 'canceled');

  // W-L record from completed matches
  let wins = 0;
  let losses = 0;
  completed.forEach((m) => {
    if (m.winner_id === teamId) wins++;
    else if (m.winner_id && m.winner_id !== teamId) losses++;
  });

  // Last 5 form
  const last5 = completed.slice(0, 5).map((m) => m.winner_id === teamId ? 'W' : 'L');

  // Grid series not already in PandaScore
  const extraGridSeries = psTeam
    ? gridSeries.filter((s) => !isGridSeriesDuplicate(s, psMatches, psTeam.id))
    : gridSeries;

  // Collect unique tournaments from PandaScore (keyed by tournament ID for dedup)
  const tournamentsMap = new Map<number, TournamentEntry>();
  psMatches.forEach((m) => {
    if (m.tournament?.id && !tournamentsMap.has(m.tournament.id)) {
      tournamentsMap.set(m.tournament.id, {
        displayName: buildTournamentName(m),
        tournamentId: m.tournament.id,
        logoUrl: m.league?.image_url ?? null,
        standing: tournamentStandings[m.tournament.id] ?? null,
      });
    }
  });
  const tournaments = Array.from(tournamentsMap.values());

  // Also collect Grid.gg tournament names that aren't already covered
  const gridOnlyTournaments: { name: string }[] = [];
  const psNames = new Set(tournaments.map((t) => t.displayName.toLowerCase()));
  gridSeries.forEach((s) => {
    if (s.tournament?.name) {
      const lower = s.tournament.name.toLowerCase();
      if (!psNames.has(lower) && !gridOnlyTournaments.some((g) => g.name.toLowerCase() === lower)) {
        gridOnlyTournaments.push({ name: s.tournament.name });
      }
    }
  });

  return (
    <div>
      {/* Team Header with logo */}
      {psTeam && (
        <div className="flex items-center gap-4 mb-6">
          {(psTeam.image_url || gridTeam?.logoUrl) && (
            <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
              <img
                src={psTeam.image_url || gridTeam!.logoUrl!}
                alt={psTeam.name}
                className="w-full h-full object-contain"
              />
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-text">{psTeam.name}</h2>
            <div className="flex items-center gap-3 mt-1">
              {psTeam.location && (
                <span className="text-sm text-text-muted">{psTeam.location}</span>
              )}
              {psTeam.acronym && (
                <span className="text-xs px-2 py-0.5 rounded bg-surface-hover border border-border text-text-secondary font-mono">
                  {psTeam.acronym}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Record + Form */}
      {(wins > 0 || losses > 0) && (
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-secondary">Record:</span>
            <span className="text-sm font-bold text-success">{wins}W</span>
            <span className="text-sm text-text-muted">-</span>
            <span className="text-sm font-bold text-live">{losses}L</span>
          </div>
          {last5.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-sm text-text-muted mr-1">Form:</span>
              {last5.map((result, i) => (
                <span
                  key={i}
                  className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded ${
                    result === 'W'
                      ? 'bg-success/20 text-success'
                      : 'bg-live/20 text-live'
                  }`}
                >
                  {result}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Roster */}
      {psTeam && psTeam.players && psTeam.players.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-3">Roster</h3>
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="flex flex-col">
              {psTeam.players.map((player, idx) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 px-5 py-2.5 ${
                    idx % 2 === 0 ? 'bg-surface' : 'bg-surface-hover/30'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-surface-hover border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                    {player.image_url ? (
                      <img src={player.image_url} alt={player.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-text-muted">
                        {player.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text text-sm truncate">{player.name}</span>
                      <CountryFlag nationality={player.nationality} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      {player.first_name && player.last_name && (
                        <span>{player.first_name} {player.last_name}</span>
                      )}
                      {player.age && <span>Age {player.age}</span>}
                      {player.role && <span className="capitalize">{player.role}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tournament Participation — right after roster */}
      {(tournaments.length > 0 || gridOnlyTournaments.length > 0) && (
        <div className="mb-8">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-3">
            Tournaments
          </h3>
          <div className="flex flex-wrap gap-2">
            {tournaments.map((t) => (
              <Link
                key={t.tournamentId}
                href={`/matches/pro/${t.tournamentId}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-hover border border-border text-sm text-text-secondary hover:border-accent/40 hover:text-accent transition-all duration-200"
              >
                {t.logoUrl && (
                  <img src={t.logoUrl} alt="" className="w-4 h-4 object-contain" />
                )}
                <span>{t.displayName}</span>
                {t.standing?.status === 'ongoing' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-live">
                    <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" />
                    Live
                  </span>
                )}
                {t.standing?.status === 'upcoming' && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-warning">
                    Upcoming
                  </span>
                )}
                {t.standing?.status === 'finished' && t.standing.rank !== null && (
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                    t.standing.rank === 1
                      ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
                      : t.standing.rank === 2
                      ? 'bg-accent/20 text-accent border-accent/40'
                      : t.standing.rank <= 4
                      ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                      : 'bg-text-muted/15 text-text-muted border-text-muted/30'
                  }`}>
                    {t.standing.rank === 1 ? '1st' : t.standing.rank === 2 ? '2nd' : t.standing.rank === 3 ? '3rd' : `${t.standing.rank}th`}
                  </span>
                )}
              </Link>
            ))}
            {gridOnlyTournaments.map((t) => (
              <span
                key={t.name}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-hover border border-border text-sm text-text-muted"
              >
                {t.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Live Matches */}
      {live.length > 0 && (
        <MatchSection
          title="Live"
          badge="bg-live"
          matches={live}
          teamId={teamId}
        />
      )}

      {/* Upcoming Matches */}
      {upcoming.length > 0 && (
        <MatchSection
          title="Upcoming"
          badge="bg-warning"
          matches={upcoming}
          teamId={teamId}
        />
      )}

      {/* Recent Results */}
      {completed.length > 0 && (
        <MatchSection
          title="Recent Results"
          badge="bg-success"
          matches={completed}
          teamId={teamId}
        />
      )}

      {/* Additional Grid.gg Series */}
      {extraGridSeries.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
              Additional Series
            </h3>
            <span className="text-xs text-text-muted">({extraGridSeries.length})</span>
          </div>
          <div className="flex flex-col gap-2">
            {extraGridSeries.map((series) => {
              const opponent = series.teams.find(
                (t) => gridTeam && t.baseInfo.id !== gridTeam.id
              )?.baseInfo;
              const dateStr = series.startTimeScheduled
                ? new Date(series.startTimeScheduled).toLocaleDateString()
                : '';

              return (
                <div
                  key={series.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface-hover/50 border border-border"
                >
                  <div className="flex items-center gap-3">
                    {opponent?.logoUrl && (
                      <img src={opponent.logoUrl} alt="" className="w-5 h-5 object-contain" />
                    )}
                    <span className="font-medium text-text text-sm">
                      vs {opponent?.name || 'TBD'}
                    </span>
                    {series.format?.nameShortened && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-surface-hover border border-border text-text-muted">
                        {series.format.nameShortened}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {series.tournament?.name && (
                      <span className="text-xs text-text-muted hidden sm:inline">
                        {series.tournament.name}
                      </span>
                    )}
                    <span className="text-xs text-text-muted" suppressHydrationWarning>
                      {dateStr}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {psMatches.length === 0 && gridSeries.length === 0 && (
        <p className="text-text-muted text-center py-8">
          No pro match data available for this team.
        </p>
      )}
    </div>
  );
}

function MatchSection({
  title,
  badge,
  matches,
  teamId,
}: {
  title: string;
  badge: string;
  matches: PSMatchResult[];
  teamId: number;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${badge}`} />
        <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">{title}</h3>
        <span className="text-xs text-text-muted">({matches.length})</span>
      </div>
      <div className="flex flex-col gap-2">
        {matches.map((match) => {
          const opponent = getOpponent(match, teamId);
          const myScore = getMatchTeamScore(match, teamId);
          const oppScore = opponent ? getMatchTeamScore(match, opponent.id) : 0;
          const isFinished = match.status === 'finished';
          const won = isFinished && match.winner_id === teamId;
          const isLive = match.status === 'running';
          const dateStr = match.scheduled_at || match.begin_at;
          const boLabel = match.number_of_games > 1 ? `BO${match.number_of_games}` : '';

          // Map score from games
          const mapScore = isFinished || isLive
            ? `${myScore}-${oppScore}`
            : null;

          // Per-map win/loss indicators from games[]
          const mapResults = (match.games || [])
            .sort((a, b) => a.position - b.position)
            .filter((g) => g.finished && g.winner)
            .map((g) => g.winner!.id === teamId ? 'W' : 'L');

          // Full event name for this match
          const eventName = buildTournamentName(match);

          return (
            <Link
              key={match.id}
              href={`/matches/pro/match/${match.id}`}
              className="group flex items-center justify-between p-3 rounded-lg bg-surface-hover/50 border border-border hover:border-accent/40 hover:bg-surface-hover transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                {isLive && (
                  <span className="flex items-center gap-1 text-xs font-bold text-live">
                    <span className="w-2 h-2 rounded-full bg-live animate-pulse" />
                    LIVE
                  </span>
                )}
                {isFinished && (
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      won ? 'bg-success/20 text-success' : 'bg-live/20 text-live'
                    }`}
                  >
                    {won ? 'W' : 'L'}
                  </span>
                )}
                {opponent?.image_url && (
                  <img src={opponent.image_url} alt="" className="w-5 h-5 object-contain" />
                )}
                <span className="font-medium text-text text-sm group-hover:text-accent transition-colors">
                  vs {opponent?.name || 'TBD'}
                </span>
                {mapScore && (
                  <span className="text-sm font-bold text-text-secondary">{mapScore}</span>
                )}
                {boLabel && (
                  <span className="text-xs text-text-muted">{boLabel}</span>
                )}
                {/* Per-map indicators */}
                {mapResults.length > 1 && (
                  <div className="hidden sm:flex items-center gap-0.5 ml-1">
                    {mapResults.map((r, i) => (
                      <span
                        key={i}
                        className={`w-4 h-4 flex items-center justify-center text-[9px] font-bold rounded-sm ${
                          r === 'W' ? 'bg-success/20 text-success' : 'bg-live/20 text-live'
                        }`}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                {match.league && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-xs text-text-muted">
                    {match.league.image_url && (
                      <img src={match.league.image_url} alt="" className="w-3.5 h-3.5 object-contain" />
                    )}
                    {eventName}
                  </span>
                )}
                <span className="text-xs text-text-muted" suppressHydrationWarning>
                  {dateStr ? new Date(dateStr).toLocaleDateString() : ''}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
