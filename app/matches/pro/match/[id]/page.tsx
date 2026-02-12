import Link from 'next/link';

interface PSTeam {
  id: number;
  name: string;
  acronym: string | null;
  location: string | null;
  image_url: string | null;
}

interface PSGame {
  id: number;
  position: number;
  status: string;
  finished: boolean;
  length: number | null;
  winner: { id: number; type: string } | null;
}

interface PSStream {
  main: boolean;
  language: string;
  raw_url: string | null;
  embed_url: string | null;
}

interface PSMatch {
  id: number;
  name: string;
  slug: string;
  status: 'not_started' | 'running' | 'finished' | 'canceled';
  match_type: string;
  number_of_games: number;
  scheduled_at: string | null;
  begin_at: string | null;
  end_at: string | null;
  forfeit: boolean;
  winner_id: number | null;
  winner: PSTeam | null;
  opponents: { type: string; opponent: PSTeam }[];
  results: { score: number; team_id: number }[];
  games: PSGame[];
  streams_list: PSStream[];
  tournament_id: number;
  tournament: { id: number; name: string };
  league: { id: number; name: string; image_url: string | null };
  serie: { id: number; full_name: string | null; name: string | null };
}

interface PSPlayer {
  id: number;
  name: string;
  first_name: string | null;
  last_name: string | null;
  age: number | null;
  nationality: string | null;
  image_url: string | null;
  role: string | null;
}

interface PSOpponentRoster {
  opponents: {
    type: string;
    opponent: PSTeam & { players: PSPlayer[] };
  }[];
}

async function fetchMatchData(matchId: string) {
  const token = process.env.PANDASCORE_API_KEY;
  if (!token) return null;

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };

  try {
    const [matchRes, opponentsRes] = await Promise.all([
      fetch(`https://api.pandascore.co/matches/${matchId}`, {
        headers,
        next: { revalidate: 30 },
      }),
      fetch(`https://api.pandascore.co/matches/${matchId}/opponents`, {
        headers,
        next: { revalidate: 30 },
      }),
    ]);

    if (!matchRes.ok) return null;

    const match = (await matchRes.json()) as PSMatch;
    const rosters = opponentsRes.ok
      ? ((await opponentsRes.json()) as PSOpponentRoster)
      : null;

    return { match, rosters };
  } catch {
    return null;
  }
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

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

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await fetchMatchData(id);

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto px-4">
        <div className="bg-surface rounded-xl border border-border p-8">
          <p className="text-live">Match not found.</p>
          <Link href="/" className="text-accent hover:underline mt-4 inline-block">
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const { match, rosters } = data;
  const team1 = match.opponents?.[0]?.opponent;
  const team2 = match.opponents?.[1]?.opponent;
  const score1 = team1 ? match.results.find((r) => r.team_id === team1.id)?.score ?? 0 : 0;
  const score2 = team2 ? match.results.find((r) => r.team_id === team2.id)?.score ?? 0 : 0;
  const isLive = match.status === 'running';
  const isFinished = match.status === 'finished';
  const boLabel = match.number_of_games > 1 ? `BO${match.number_of_games}` : 'BO1';

  const tournamentId = match.tournament_id || match.tournament?.id;
  const leagueName = match.league?.name || '';
  const serieName = match.serie?.full_name || match.serie?.name || '';
  const breadcrumb = serieName ? `${leagueName}: ${serieName}` : leagueName;

  const dateStr = match.scheduled_at || match.begin_at;
  const formattedDate = dateStr
    ? new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

  const roster1 = rosters?.opponents?.[0]?.opponent?.players || [];
  const roster2 = rosters?.opponents?.[1]?.opponent?.players || [];

  const streams = (match.streams_list || []).filter((s) => s.raw_url);

  return (
    <div className="max-w-5xl mx-auto px-4">
      {/* Back link */}
      {tournamentId && (
        <Link href={`/matches/pro/${tournamentId}`} className="text-accent hover:underline text-sm mb-4 inline-block">
          &larr; Back to Tournament
        </Link>
      )}

      {/* HLTV-Style Header Card */}
      <div className={`rounded-xl border overflow-hidden mb-6 ${isLive ? 'border-live/30 shadow-lg shadow-live/5' : 'border-border'}`}>
        <div className="bg-gradient-to-b from-surface-hover via-surface to-surface p-6 sm:p-8">
          {/* Breadcrumb with league logo */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {match.league?.image_url && (
              <img src={match.league.image_url} alt={leagueName} className="w-5 h-5 object-contain" />
            )}
            <span className="text-sm text-text-muted">{breadcrumb}</span>
          </div>

          {/* Status badge */}
          <div className="flex justify-center mb-5">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-live px-3 py-1 bg-live/10 border border-live/30 rounded-full">
                <span className="w-2 h-2 rounded-full bg-live animate-pulse" />
                Live
              </span>
            ) : isFinished ? (
              <span className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-text-muted px-3 py-1 bg-text-muted/10 border border-text-muted/30 rounded-full">
                Match Over
              </span>
            ) : (
              <span className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-warning px-3 py-1 bg-warning/10 border border-warning/30 rounded-full">
                Upcoming
              </span>
            )}
          </div>

          {/* Teams + Score */}
          <div className="flex items-center justify-center gap-6 sm:gap-10">
            {/* Team 1 */}
            <div className="flex flex-col items-center gap-3 min-w-0 flex-1">
              <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
                {team1?.image_url ? (
                  <img src={team1.image_url} alt={team1.name} className="w-full h-full object-contain" />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-surface-hover border border-border flex items-center justify-center">
                    <span className="text-2xl font-bold text-text-muted">
                      {(team1?.acronym || team1?.name || '?').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <span className={`font-bold text-lg sm:text-xl text-center truncate max-w-full ${isFinished && match.winner_id !== team1?.id ? 'text-text-muted' : 'text-text'}`}>
                {team1?.name || 'TBD'}
              </span>
            </div>

            {/* Score */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              {isFinished || isLive ? (
                <div className="flex items-center gap-3">
                  <span className={`text-5xl font-black tabular-nums ${isFinished && match.winner_id === team1?.id ? 'text-success' : isLive ? 'text-text' : 'text-text-muted'}`}>
                    {score1}
                  </span>
                  <span className="text-3xl text-text-muted font-light">:</span>
                  <span className={`text-5xl font-black tabular-nums ${isFinished && match.winner_id === team2?.id ? 'text-success' : isLive ? 'text-text' : 'text-text-muted'}`}>
                    {score2}
                  </span>
                </div>
              ) : (
                <span className="text-3xl text-text-muted font-medium">vs</span>
              )}
              <span className="text-xs text-text-muted font-semibold uppercase tracking-wider">{boLabel}</span>
            </div>

            {/* Team 2 */}
            <div className="flex flex-col items-center gap-3 min-w-0 flex-1">
              <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
                {team2?.image_url ? (
                  <img src={team2.image_url} alt={team2.name} className="w-full h-full object-contain" />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-surface-hover border border-border flex items-center justify-center">
                    <span className="text-2xl font-bold text-text-muted">
                      {(team2?.acronym || team2?.name || '?').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <span className={`font-bold text-lg sm:text-xl text-center truncate max-w-full ${isFinished && match.winner_id !== team2?.id ? 'text-text-muted' : 'text-text'}`}>
                {team2?.name || 'TBD'}
              </span>
            </div>
          </div>

          {/* Date + forfeit */}
          <div className="flex items-center justify-center gap-3 mt-5 text-sm text-text-muted">
            {formattedDate && <span suppressHydrationWarning>{formattedDate}</span>}
            {match.forfeit && (
              <>
                <span className="w-1 h-1 rounded-full bg-text-muted" />
                <span className="text-warning font-semibold">Forfeit</span>
              </>
            )}
          </div>

          {/* Stream buttons (live) */}
          {isLive && streams.length > 0 && (
            <div className="flex items-center justify-center gap-3 mt-5">
              {streams.map((stream, i) => (
                <a
                  key={i}
                  href={stream.raw_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-live/10 border border-live/30 text-live text-sm font-semibold hover:bg-live/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  Watch{stream.language ? ` (${stream.language.toUpperCase()})` : ''}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map Result Cards */}
      {match.games && match.games.length > 0 && (isFinished || isLive) && (
        <div className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-4">Map Results</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {match.games
              .sort((a, b) => a.position - b.position)
              .map((game) => {
                const gameWinnerId = game.winner?.id;
                const team1Won = gameWinnerId === team1?.id;
                const team2Won = gameWinnerId === team2?.id;
                const isGameFinished = game.finished;
                const isGameLive = game.status === 'running';

                return (
                  <div
                    key={game.id}
                    className={`rounded-xl border overflow-hidden ${
                      isGameLive ? 'border-live/40 shadow-md shadow-live/10' : 'border-border'
                    }`}
                  >
                    {/* Map header */}
                    <div className={`px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-between ${
                      isGameLive ? 'bg-live/10 text-live' : isGameFinished ? 'bg-surface-hover text-text-muted' : 'bg-surface-hover text-text-muted'
                    }`}>
                      <span>Map {game.position}</span>
                      {isGameLive && (
                        <span className="inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" />
                          Live
                        </span>
                      )}
                      {isGameFinished && <span className="text-success">Finished</span>}
                      {!isGameFinished && !isGameLive && <span>Upcoming</span>}
                    </div>

                    {/* Team 1 row */}
                    <div className={`flex items-center gap-3 px-4 py-2.5 bg-surface ${
                      isGameFinished && !team1Won ? 'opacity-50' : ''
                    }`}>
                      {team1?.image_url ? (
                        <img src={team1.image_url} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded bg-surface-hover flex-shrink-0" />
                      )}
                      <span className="text-sm font-semibold text-text flex-1 truncate">
                        {team1?.acronym || team1?.name || 'TBD'}
                      </span>
                      {isGameFinished && team1Won && (
                        <svg className="w-4 h-4 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    <div className="border-t border-border/50" />

                    {/* Team 2 row */}
                    <div className={`flex items-center gap-3 px-4 py-2.5 bg-surface ${
                      isGameFinished && !team2Won ? 'opacity-50' : ''
                    }`}>
                      {team2?.image_url ? (
                        <img src={team2.image_url} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded bg-surface-hover flex-shrink-0" />
                      )}
                      <span className="text-sm font-semibold text-text flex-1 truncate">
                        {team2?.acronym || team2?.name || 'TBD'}
                      </span>
                      {isGameFinished && team2Won && (
                        <svg className="w-4 h-4 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    {/* Duration footer */}
                    {game.length && game.length > 0 ? (
                      <div className="border-t border-border/50 px-4 py-1.5 bg-surface">
                        <span className="text-[11px] text-text-muted">{formatDuration(game.length)}</span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Team Rosters */}
      {(roster1.length > 0 || roster2.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {[
            { team: team1, players: roster1 },
            { team: team2, players: roster2 },
          ].map(({ team, players }, idx) => (
            players.length > 0 && (
              <div key={idx} className="bg-surface rounded-xl border border-border overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-3 bg-surface-hover/50 border-b border-border">
                  {team?.image_url && (
                    <img src={team.image_url} alt={team.name} className="w-6 h-6 object-contain" />
                  )}
                  <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
                    {team?.name || 'TBD'}
                  </h3>
                </div>
                <div className="flex flex-col">
                  {players.map((player, pIdx) => (
                    <div
                      key={player.id}
                      className={`flex items-center gap-3 px-5 py-2.5 ${
                        pIdx % 2 === 0 ? 'bg-surface' : 'bg-surface-hover/30'
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
            )
          ))}
        </div>
      )}

      {/* Non-live streams */}
      {!isLive && streams.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-3">Streams</h2>
          <div className="flex flex-wrap gap-2">
            {streams.map((stream, i) => (
              <a
                key={i}
                href={stream.raw_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-hover border border-border text-text-secondary text-sm font-medium hover:border-accent/40 hover:text-accent transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                {stream.language ? stream.language.toUpperCase() : `Stream ${i + 1}`}
                {stream.main && <span className="text-[10px] text-accent font-bold ml-1">MAIN</span>}
              </a>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
