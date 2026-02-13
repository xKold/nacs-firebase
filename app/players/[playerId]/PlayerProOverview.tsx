'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ProPlayerData, ComputedPlayerStats, PSPlayerCareerStats } from '@/lib/pro-player-api';
import type { PSMatchResult, TournamentStanding, GridSeries } from '@/lib/pro-team-api';

const EVENTS_INITIAL = 8;
const MATCHES_INITIAL = 10;
const ONE_YEAR_AGO = Date.now() - 365 * 24 * 60 * 60 * 1000;

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

function buildTournamentName(match: PSMatchResult): string {
  const serieName = match.serie?.full_name || match.serie?.name;
  const tournamentName = match.tournament?.name;
  const leagueName = match.league?.name;
  if (serieName && tournamentName && tournamentName !== serieName) {
    return `${serieName} - ${tournamentName}`;
  }
  if (serieName) return serieName;
  if (tournamentName && leagueName && tournamentName !== leagueName) {
    return `${leagueName}: ${tournamentName}`;
  }
  return tournamentName || leagueName || 'Unknown Event';
}

function isGridSeriesDuplicate(series: GridSeries, psMatches: PSMatchResult[], psTeamId: number): boolean {
  const seriesDate = series.startTimeScheduled ? new Date(series.startTimeScheduled).toDateString() : null;
  if (!seriesDate) return false;
  const seriesOpponents = series.teams.map((t) => t.baseInfo.name.toLowerCase()).filter(Boolean);
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

/** Filter non-pro ESEA leagues: only keep Challenger/ECL/Premier, exclude Open/Intermediate/Main/Advanced */
function isProEvent(name: string): boolean {
  const lower = name.toLowerCase();
  if (lower.includes('esea')) {
    if (lower.includes('challenger') || lower.includes('ecl') || lower.includes('premier')) return true;
    if (lower.includes('open') || lower.includes('intermediate') || lower.includes('main') || lower.includes('advanced')) return false;
  }
  return true;
}

/** Derive display stats from PandaScore career stats or Grid.gg computed stats */
function deriveEffectiveStats(
  careerStats: PSPlayerCareerStats | null,
  computedStats: ComputedPlayerStats | null,
) {
  if (careerStats) {
    const kpr = careerStats.kills_per_round;
    const dpr = careerStats.deaths_per_round;
    return {
      rating: careerStats.rating,
      kpr,
      dpr,
      kd: kpr !== null && dpr !== null && dpr > 0 ? kpr / dpr : null,
      adr: careerStats.adr,
      hsPercent: careerStats.headshot_percentage,
      kast: careerStats.kast,
      mapsPlayed: null as number | null,
      source: 'pandascore' as const,
    };
  }
  if (computedStats && computedStats.totalRounds > 0) {
    return {
      rating: null as number | null,
      kpr: computedStats.totalKills / computedStats.totalRounds,
      dpr: computedStats.totalDeaths / computedStats.totalRounds,
      kd: computedStats.totalDeaths > 0 ? computedStats.totalKills / computedStats.totalDeaths : null,
      adr: computedStats.totalDamage / computedStats.totalRounds,
      hsPercent: computedStats.totalKills > 0 ? (computedStats.totalHeadshots / computedStats.totalKills) * 100 : null,
      kast: null as number | null,
      mapsPlayed: computedStats.mapsPlayed,
      source: 'grid' as const,
    };
  }
  return null;
}

interface TournamentEntry {
  displayName: string;
  tournamentId: number | null;
  logoUrl: string | null;
  standing: TournamentStanding | null;
}

interface PlayerProOverviewProps {
  data: ProPlayerData;
  playerNickname: string;
  faceitTeams: { teamId: string; name: string }[];
}

export default function PlayerProOverview({ data, playerNickname, faceitTeams }: PlayerProOverviewProps) {
  const { psPlayer, currentTeam, psMatches, tournamentStandings, careerStats, computedStats, gridTeam, gridSeries } = data;
  const teamId = currentTeam?.id ?? 0;

  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showAllCompleted, setShowAllCompleted] = useState(false);

  const effectiveStats = deriveEffectiveStats(careerStats, computedStats);

  const upcoming = psMatches.filter((m) => m.status === 'not_started');
  const live = psMatches.filter((m) => m.status === 'running');
  const completed = psMatches.filter((m) => m.status === 'finished' || m.status === 'canceled');

  // Grid series not already in PandaScore, also filter non-pro ESEA leagues
  const extraGridSeries = (currentTeam
    ? gridSeries.filter((s) => !isGridSeriesDuplicate(s, psMatches, currentTeam.id))
    : gridSeries
  ).filter((s) => !s.tournament?.name || isProEvent(s.tournament.name));

  // Collect ALL tournaments (PandaScore + Grid-only), filter to last year
  const tournamentsMap = new Map<string, TournamentEntry>();

  psMatches.forEach((m) => {
    if (!m.tournament?.id) return;
    const key = `ps-${m.tournament.id}`;
    if (tournamentsMap.has(key)) return;
    // Filter: only events from last year onwards
    const matchDate = m.scheduled_at || m.begin_at;
    if (matchDate && new Date(matchDate).getTime() < ONE_YEAR_AGO) return;
    const displayName = buildTournamentName(m);
    // Filter non-pro ESEA leagues
    if (!isProEvent(displayName)) return;
    tournamentsMap.set(key, {
      displayName,
      tournamentId: m.tournament.id,
      logoUrl: m.league?.image_url ?? null,
      standing: tournamentStandings[m.tournament.id] ?? null,
    });
  });

  // Add Grid.gg-only tournaments (same style, no greying)
  const psNames = new Set(Array.from(tournamentsMap.values()).map((t) => t.displayName.toLowerCase()));
  gridSeries.forEach((s) => {
    if (!s.tournament?.name) return;
    const lower = s.tournament.name.toLowerCase();
    if (psNames.has(lower)) return;
    if (tournamentsMap.has(`grid-${lower}`)) return;
    // Filter to last year
    if (s.startTimeScheduled && new Date(s.startTimeScheduled).getTime() < ONE_YEAR_AGO) return;
    // Filter non-pro ESEA leagues
    if (!isProEvent(s.tournament.name)) return;
    tournamentsMap.set(`grid-${lower}`, {
      displayName: s.tournament.name,
      tournamentId: null,
      logoUrl: null,
      standing: null,
    });
    psNames.add(lower);
  });

  const allTournaments = Array.from(tournamentsMap.values());
  const visibleTournaments = showAllEvents ? allTournaments : allTournaments.slice(0, EVENTS_INITIAL);
  const hasMoreEvents = allTournaments.length > EVENTS_INITIAL;

  // Match FACEIT team to PandaScore team for clickable link
  const matchedFaceitTeam = faceitTeams.find((ft) => {
    if (!currentTeam) return false;
    const ftLower = ft.name.toLowerCase();
    const ctLower = currentTeam.name.toLowerCase();
    return ftLower === ctLower || ftLower.includes(ctLower) || ctLower.includes(ftLower);
  });

  // Completed matches: show max MATCHES_INITIAL initially
  const visibleCompleted = showAllCompleted ? completed : completed.slice(0, MATCHES_INITIAL);
  const hasMoreCompleted = completed.length > MATCHES_INITIAL;

  return (
    <div>
      {/* Player Header */}
      {psPlayer && (
        <div className="flex items-center gap-4 mb-6">
          {psPlayer.image_url && (
            <div className="w-16 h-16 flex items-center justify-center flex-shrink-0 rounded-full overflow-hidden border border-border">
              <img src={psPlayer.image_url} alt={psPlayer.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-text">{psPlayer.name}</h2>
              <CountryFlag nationality={psPlayer.nationality} />
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-text-muted">
              {psPlayer.first_name && psPlayer.last_name && (
                <span>{psPlayer.first_name} {psPlayer.last_name}</span>
              )}
              {psPlayer.age && <span>Age {psPlayer.age}</span>}
              {psPlayer.role && <span className="capitalize">{psPlayer.role}</span>}
            </div>
            {/* HLTV link */}
            <div className="flex items-center gap-2 mt-2">
              <a
                href={`https://www.hltv.org/search?query=${encodeURIComponent(playerNickname)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm px-3 py-1 rounded-lg bg-surface-hover border border-border text-text-secondary hover:text-accent hover:border-accent/40 transition-all duration-200"
              >
                HLTV Profile &rarr;
              </a>
            </div>
          </div>
        </div>
      )}

      {/* HLTV link fallback when no psPlayer but we have data */}
      {!psPlayer && (
        <div className="flex items-center gap-2 mb-6">
          <a
            href={`https://www.hltv.org/search?query=${encodeURIComponent(playerNickname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm px-3 py-1.5 rounded-lg bg-surface-hover border border-border text-text-secondary hover:text-accent hover:border-accent/40 transition-all duration-200"
          >
            HLTV Profile &rarr;
          </a>
        </div>
      )}

      {/* Current Team — clickable */}
      {currentTeam && (
        <div className="mb-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-3">Current Team</h3>
          {matchedFaceitTeam ? (
            <Link
              href={`/teams/${matchedFaceitTeam.teamId}?view=pro`}
              className="inline-flex items-center gap-3 px-4 py-2.5 rounded-lg bg-surface-hover border border-border hover:border-accent/40 hover:bg-surface-hover transition-all duration-200"
            >
              {currentTeam.image_url && (
                <img src={currentTeam.image_url} alt={currentTeam.name} className="w-6 h-6 object-contain" />
              )}
              <span className="font-semibold text-text hover:text-accent transition-colors">{currentTeam.name}</span>
              {currentTeam.acronym && (
                <span className="text-xs px-2 py-0.5 rounded bg-surface border border-border text-text-secondary font-mono">
                  {currentTeam.acronym}
                </span>
              )}
            </Link>
          ) : (
            <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-lg bg-surface-hover border border-border">
              {currentTeam.image_url && (
                <img src={currentTeam.image_url} alt={currentTeam.name} className="w-6 h-6 object-contain" />
              )}
              <span className="font-semibold text-text">{currentTeam.name}</span>
              {currentTeam.acronym && (
                <span className="text-xs px-2 py-0.5 rounded bg-surface border border-border text-text-secondary font-mono">
                  {currentTeam.acronym}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Career Stats — HLTV-style bars */}
      {effectiveStats && (
        <div className="mb-8">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-3">
            Career Stats
            {effectiveStats.mapsPlayed !== null && (
              <span className="ml-2 text-xs font-normal text-text-muted">({effectiveStats.mapsPlayed} maps)</span>
            )}
          </h3>
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <StatBar label="Rating" value={effectiveStats.rating} max={2} format={(v) => v.toFixed(2)} />
            <StatBar label="K/D" value={effectiveStats.kd} max={2} format={(v) => v.toFixed(2)} />
            <StatBar label="KPR" value={effectiveStats.kpr} max={1.5} format={(v) => v.toFixed(2)} />
            <StatBar label="DPR" value={effectiveStats.dpr} max={1.0} format={(v) => v.toFixed(2)} invert />
            <StatBar label="ADR" value={effectiveStats.adr} max={120} format={(v) => v.toFixed(1)} />
            <StatBar label="HS%" value={effectiveStats.hsPercent} max={100} format={(v) => `${v.toFixed(1)}%`} />
            <StatBar label="KAST" value={effectiveStats.kast} max={100} format={(v) => `${v.toFixed(1)}%`} />
          </div>
        </div>
      )}

      {/* Tournaments — filtered to last year, show more */}
      {allTournaments.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-3">
            Tournaments
          </h3>
          <div className="flex flex-wrap gap-2">
            {visibleTournaments.map((t, i) => {
              const inner = (
                <>
                  {t.logoUrl && <img src={t.logoUrl} alt="" className="w-4 h-4 object-contain" />}
                  <span>{t.displayName}</span>
                  {t.standing?.status === 'ongoing' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-live">
                      <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" />
                      Live
                    </span>
                  )}
                  {t.standing?.status === 'upcoming' && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-warning">Upcoming</span>
                  )}
                  {t.standing?.status === 'finished' && t.standing.rank !== null && (
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                      t.standing.rank === 1 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
                      : t.standing.rank === 2 ? 'bg-accent/20 text-accent border-accent/40'
                      : t.standing.rank <= 4 ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                      : 'bg-text-muted/15 text-text-muted border-text-muted/30'
                    }`}>
                      {t.standing.rank === 1 ? '1st' : t.standing.rank === 2 ? '2nd' : t.standing.rank === 3 ? '3rd' : `${t.standing.rank}th`}
                    </span>
                  )}
                </>
              );

              return t.tournamentId ? (
                <Link
                  key={`t-${i}`}
                  href={`/matches/pro/${t.tournamentId}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-hover border border-border text-sm text-text-secondary hover:border-accent/40 hover:text-accent transition-all duration-200"
                >
                  {inner}
                </Link>
              ) : (
                <span
                  key={`t-${i}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-hover border border-border text-sm text-text-secondary"
                >
                  {inner}
                </span>
              );
            })}
          </div>
          {hasMoreEvents && !showAllEvents && (
            <button
              onClick={() => setShowAllEvents(true)}
              className="mt-3 text-sm font-medium text-accent hover:text-accent/80 transition-colors"
            >
              Show all {allTournaments.length} events
            </button>
          )}
        </div>
      )}

      {/* Live Matches */}
      {live.length > 0 && (
        <MatchSection title="Live" badge="bg-live" matches={live} teamId={teamId} />
      )}

      {/* Upcoming Matches */}
      {upcoming.length > 0 && (
        <MatchSection title="Upcoming" badge="bg-warning" matches={upcoming} teamId={teamId} />
      )}

      {/* Recent Results — with show more */}
      {completed.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-success" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">Recent Results</h3>
            <span className="text-xs text-text-muted">({completed.length})</span>
          </div>
          <div className="flex flex-col gap-2">
            {visibleCompleted.map((match) => (
              <MatchRow key={match.id} match={match} teamId={teamId} />
            ))}
          </div>
          {hasMoreCompleted && !showAllCompleted && (
            <button
              onClick={() => setShowAllCompleted(true)}
              className="mt-3 text-sm font-medium text-accent hover:text-accent/80 transition-colors"
            >
              Show all {completed.length} matches
            </button>
          )}
        </div>
      )}

      {/* Additional Grid.gg Series */}
      {extraGridSeries.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">Additional Series</h3>
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
                <div key={series.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-hover/50 border border-border">
                  <div className="flex items-center gap-3">
                    {opponent?.logoUrl && <img src={opponent.logoUrl} alt="" className="w-5 h-5 object-contain" />}
                    <span className="font-medium text-text text-sm">vs {opponent?.name || 'TBD'}</span>
                    {series.format?.nameShortened && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-surface-hover border border-border text-text-muted">{series.format.nameShortened}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {series.tournament?.name && <span className="text-xs text-text-muted hidden sm:inline">{series.tournament.name}</span>}
                    <span className="text-xs text-text-muted" suppressHydrationWarning>{dateStr}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {psMatches.length === 0 && extraGridSeries.length === 0 && !effectiveStats && (
        <p className="text-text-muted text-center py-8">No pro match data available for this player.</p>
      )}
    </div>
  );
}

// --- HLTV-style stat bar ---

function StatBar({
  label,
  value,
  max,
  format,
  invert,
}: {
  label: string;
  value: number | null;
  max: number;
  format: (v: number) => string;
  invert?: boolean;
}) {
  if (value === null || value === undefined) return null;
  const percent = Math.min((value / max) * 100, 100);
  const barColor = invert ? 'bg-live/60' : 'bg-accent';
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 last:border-b-0">
      <span className="text-sm font-medium text-text-secondary w-16 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-surface-hover rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-sm font-bold text-text tabular-nums w-16 text-right">{format(value)}</span>
    </div>
  );
}

// --- Match row (used by MatchSection and completed section) ---

function MatchRow({ match, teamId }: { match: PSMatchResult; teamId: number }) {
  const opponent = getOpponent(match, teamId);
  const myScore = getMatchTeamScore(match, teamId);
  const oppScore = opponent ? getMatchTeamScore(match, opponent.id) : 0;
  const isFinished = match.status === 'finished';
  const won = isFinished && match.winner_id === teamId;
  const isLive = match.status === 'running';
  const dateStr = match.scheduled_at || match.begin_at;
  const boLabel = match.number_of_games > 1 ? `BO${match.number_of_games}` : '';
  const mapScore = isFinished || isLive ? `${myScore}-${oppScore}` : null;
  const eventName = buildTournamentName(match);
  const mapResults = (match.games || [])
    .sort((a, b) => a.position - b.position)
    .filter((g) => g.finished && g.winner)
    .map((g) => g.winner!.id === teamId ? 'W' : 'L');

  return (
    <Link
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
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${won ? 'bg-success/20 text-success' : 'bg-live/20 text-live'}`}>
            {won ? 'W' : 'L'}
          </span>
        )}
        {opponent?.image_url && <img src={opponent.image_url} alt="" className="w-5 h-5 object-contain" />}
        <span className="font-medium text-text text-sm group-hover:text-accent transition-colors">vs {opponent?.name || 'TBD'}</span>
        {mapScore && <span className="text-sm font-bold text-text-secondary">{mapScore}</span>}
        {boLabel && <span className="text-xs text-text-muted">{boLabel}</span>}
        {mapResults.length > 1 && (
          <div className="hidden sm:flex items-center gap-0.5 ml-1">
            {mapResults.map((r, i) => (
              <span key={i} className={`w-4 h-4 flex items-center justify-center text-[9px] font-bold rounded-sm ${r === 'W' ? 'bg-success/20 text-success' : 'bg-live/20 text-live'}`}>
                {r}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        {match.league && (
          <span className="hidden sm:inline-flex items-center gap-1 text-xs text-text-muted">
            {match.league.image_url && <img src={match.league.image_url} alt="" className="w-3.5 h-3.5 object-contain" />}
            {eventName}
          </span>
        )}
        <span className="text-xs text-text-muted" suppressHydrationWarning>{dateStr ? new Date(dateStr).toLocaleDateString() : ''}</span>
      </div>
    </Link>
  );
}

// --- Match section (live, upcoming — no truncation needed) ---

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
        {matches.map((match) => (
          <MatchRow key={match.id} match={match} teamId={teamId} />
        ))}
      </div>
    </div>
  );
}
