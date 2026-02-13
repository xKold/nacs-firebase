'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  NormalizedMatchStats,
  NormalizedMapStats,
  NormalizedPlayerStat,
  StatColumnKey,
  STAT_COLUMNS,
} from '@/lib/types/match-stats';

type SideFilter = 'both' | 'ct' | 't';

interface MatchStatsTableProps {
  stats: NormalizedMatchStats;
  competitionId?: string;
}

/** Aggregate player stats across multiple maps */
function aggregatePlayerStats(
  maps: NormalizedMapStats[],
  teamKey: 'team1Players' | 'team2Players',
): NormalizedPlayerStat[] {
  const playerMap = new Map<string, NormalizedPlayerStat>();

  for (const map of maps) {
    for (const p of map[teamKey]) {
      const existing = playerMap.get(p.playerId);
      if (!existing) {
        playerMap.set(p.playerId, { ...p });
      } else {
        existing.kills += p.kills;
        existing.deaths += p.deaths;
        existing.assists += p.assists;
        existing.kdDiff = existing.kills - existing.deaths;
        existing.kdRatio =
          existing.deaths > 0 ? existing.kills / existing.deaths : existing.kills;

        // Weighted HS% by kills
        if (p.hsPercent !== undefined && existing.hsPercent !== undefined) {
          const prevHSCount = (existing.kills - p.kills) * (existing.hsPercent / 100);
          const curHSCount = p.kills * (p.hsPercent / 100);
          existing.hsPercent =
            existing.kills > 0
              ? ((prevHSCount + curHSCount) / existing.kills) * 100
              : 0;
        }

        // Sum MVPs
        if (p.mvps !== undefined) {
          existing.mvps = (existing.mvps ?? 0) + p.mvps;
        }

        // Average K/R ratio
        if (p.krRatio !== undefined && existing.krRatio !== undefined) {
          existing.krRatio = (existing.krRatio + p.krRatio) / 2;
        }

        // Average ADR
        if (p.adr !== undefined && existing.adr !== undefined) {
          existing.adr = (existing.adr + p.adr) / 2;
        }

        // Average KAST
        if (p.kast !== undefined && existing.kast !== undefined) {
          existing.kast = (existing.kast + p.kast) / 2;
        }

        // Average rating
        if (p.rating !== undefined && existing.rating !== undefined) {
          existing.rating = (existing.rating + p.rating) / 2;
        }

        // Sum multi-kills
        if (p.tripleKills !== undefined) {
          existing.tripleKills = (existing.tripleKills ?? 0) + p.tripleKills;
        }
        if (p.quadroKills !== undefined) {
          existing.quadroKills = (existing.quadroKills ?? 0) + p.quadroKills;
        }
        if (p.pentaKills !== undefined) {
          existing.pentaKills = (existing.pentaKills ?? 0) + p.pentaKills;
        }
      }
    }
  }

  return Array.from(playerMap.values());
}

/** Get the primary sort column based on available columns */
function getSortColumn(columns: StatColumnKey[]): StatColumnKey {
  // Prefer rating > kills for sorting
  if (columns.includes('rating')) return 'rating';
  return 'kills';
}

/** Sort players by the given column descending */
function sortPlayers(
  players: NormalizedPlayerStat[],
  column: StatColumnKey,
): NormalizedPlayerStat[] {
  return [...players].sort((a, b) => {
    const aVal = (a as unknown as Record<string, number | undefined>)[column] ?? 0;
    const bVal = (b as unknown as Record<string, number | undefined>)[column] ?? 0;
    return bVal - aVal;
  });
}

export default function MatchStatsTable({
  stats,
  competitionId,
}: MatchStatsTableProps) {
  const [selectedMap, setSelectedMap] = useState<number | 'overall'>('overall');
  const [sideFilter, setSideFilter] = useState<SideFilter>('both');

  const columns = stats.availableColumns;
  const sortCol = getSortColumn(columns);

  // Get players for current selection
  const { team1Players, team2Players } = useMemo(() => {
    if (selectedMap === 'overall') {
      // Determine which player key based on side filter
      let t1Key: keyof NormalizedMapStats = 'team1Players';
      let t2Key: keyof NormalizedMapStats = 'team2Players';

      if (sideFilter === 'ct' && stats.hasSideSplits) {
        t1Key = 'team1PlayersCT';
        t2Key = 'team2PlayersCT';
      } else if (sideFilter === 't' && stats.hasSideSplits) {
        t1Key = 'team1PlayersT';
        t2Key = 'team2PlayersT';
      }

      // Check that side data exists, fall back to 'both'
      const hasData = stats.maps.some(
        (m) => (m[t1Key] as NormalizedPlayerStat[] | undefined)?.length
      );
      if (!hasData) {
        t1Key = 'team1Players';
        t2Key = 'team2Players';
      }

      return {
        team1Players: sortPlayers(
          aggregatePlayerStats(stats.maps, t1Key as 'team1Players'),
          sortCol,
        ),
        team2Players: sortPlayers(
          aggregatePlayerStats(stats.maps, t2Key as 'team2Players'),
          sortCol,
        ),
      };
    }

    const map = stats.maps[selectedMap];
    if (!map) return { team1Players: [], team2Players: [] };

    let t1: NormalizedPlayerStat[];
    let t2: NormalizedPlayerStat[];

    if (sideFilter === 'ct' && stats.hasSideSplits && map.team1PlayersCT?.length) {
      t1 = map.team1PlayersCT;
      t2 = map.team2PlayersCT || map.team2Players;
    } else if (sideFilter === 't' && stats.hasSideSplits && map.team1PlayersT?.length) {
      t1 = map.team1PlayersT;
      t2 = map.team2PlayersT || map.team2Players;
    } else {
      t1 = map.team1Players;
      t2 = map.team2Players;
    }

    return {
      team1Players: sortPlayers(t1, sortCol),
      team2Players: sortPlayers(t2, sortCol),
    };
  }, [selectedMap, sideFilter, stats, sortCol]);

  // Compute overall scores for the tab label
  const overallScore1 = stats.maps.filter((m) => m.team1Won).length;
  const overallScore2 = stats.maps.filter((m) => !m.team1Won).length;

  if (stats.maps.length === 0) return null;

  return (
    <section>
      {/* Map tabs */}
      <div className="border-b border-border mb-4">
        <div className="flex flex-wrap gap-0">
          <button
            onClick={() => setSelectedMap('overall')}
            className={`px-4 py-3 text-sm font-medium transition-all duration-200 border-b-2 -mb-px ${
              selectedMap === 'overall'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-text hover:border-text-muted/30'
            }`}
          >
            All Maps ({overallScore1} - {overallScore2})
          </button>
          {stats.maps.map((map, i) => (
            <button
              key={i}
              onClick={() => setSelectedMap(i)}
              className={`px-4 py-3 text-sm font-medium transition-all duration-200 border-b-2 -mb-px ${
                selectedMap === i
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text hover:border-text-muted/30'
              }`}
            >
              {map.mapName} ({map.team1Score}-{map.team2Score})
            </button>
          ))}
        </div>
      </div>

      {/* Side filter — only shown when data supports it */}
      {stats.hasSideSplits && (
        <div className="flex gap-1 mb-5 bg-surface-hover/50 rounded-lg p-1 w-fit">
          {(['both', 't', 'ct'] as SideFilter[]).map((side) => (
            <button
              key={side}
              onClick={() => setSideFilter(side)}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                sideFilter === side
                  ? side === 'ct'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : side === 't'
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      : 'bg-surface text-text border border-border'
                  : 'text-text-muted hover:text-text border border-transparent'
              }`}
            >
              {side === 'both' ? 'Both' : side === 'ct' ? 'Counter-Terrorist' : 'Terrorist'}
            </button>
          ))}
        </div>
      )}

      {/* Team 1 table */}
      <TeamStatsTable
        teamName={stats.team1Name}
        imageUrl={stats.team1ImageUrl}
        players={team1Players}
        columns={columns}
        competitionId={competitionId}
        isTeam1
      />

      {/* Team 2 table */}
      <TeamStatsTable
        teamName={stats.team2Name}
        imageUrl={stats.team2ImageUrl}
        players={team2Players}
        columns={columns}
        competitionId={competitionId}
        isTeam1={false}
      />
    </section>
  );
}

interface TeamStatsTableProps {
  teamName: string;
  imageUrl?: string;
  players: NormalizedPlayerStat[];
  columns: StatColumnKey[];
  competitionId?: string;
  isTeam1: boolean;
}

function TeamStatsTable({
  teamName,
  imageUrl,
  players,
  columns,
  competitionId,
  isTeam1,
}: TeamStatsTableProps) {
  if (players.length === 0) return null;

  return (
    <div className="mb-6">
      {/* Team header bar */}
      <div
        className={`rounded-t-lg border border-border px-4 py-2.5 flex items-center gap-3 ${
          isTeam1 ? 'bg-accent/5 border-accent/20' : 'bg-surface-hover/50'
        }`}
      >
        {imageUrl && (
          <img src={imageUrl} alt={teamName} className="w-6 h-6 object-contain" />
        )}
        <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
          {teamName}
        </h3>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-t-0 border-border rounded-b-lg">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Player
              </th>
              {columns.map((colKey) => {
                const col = STAT_COLUMNS[colKey];
                return (
                  <th
                    key={colKey}
                    className="text-center px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-text-muted"
                  >
                    {col.shortLabel}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {players.map((player, pIdx) => (
              <tr
                key={player.playerId}
                className={pIdx % 2 === 0 ? 'bg-surface' : 'bg-surface-hover/30'}
              >
                <td className="px-4 py-2.5 font-medium text-text">
                  {competitionId ? (
                    <Link
                      href={`/players/${player.playerId}?championship=${competitionId}`}
                      className="hover:text-accent transition-colors"
                    >
                      {player.nickname}
                    </Link>
                  ) : player.faceitId ? (
                    <Link
                      href={`/players/${player.faceitId}?view=pro`}
                      className="hover:text-accent transition-colors"
                    >
                      {player.nickname}
                    </Link>
                  ) : (
                    <span>{player.nickname}</span>
                  )}
                </td>
                {columns.map((colKey) => {
                  const col = STAT_COLUMNS[colKey];
                  const value = (player as unknown as Record<string, number | undefined>)[colKey];
                  const colorClass = col.colorFn ? col.colorFn(value) : 'text-text-secondary';

                  return (
                    <td
                      key={colKey}
                      className={`text-center px-3 py-2.5 font-medium tabular-nums ${colorClass}`}
                    >
                      {col.format(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
