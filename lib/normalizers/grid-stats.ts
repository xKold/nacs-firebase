import {
  NormalizedMatchStats,
  NormalizedMapStats,
  NormalizedPlayerStat,
  StatColumnKey,
} from '../types/match-stats';
import type { GridSeriesState, GridGameStats, GridGamePlayerStats } from '../pro-team-api';

function formatMapName(raw: string): string {
  // Strip "de_" prefix and capitalize
  const stripped = raw.replace(/^de_/i, '');
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

function normalizePlayer(
  p: GridGamePlayerStats,
  totalRounds: number,
): NormalizedPlayerStat {
  const kills = p.kills;
  const deaths = p.deaths;
  const assists = p.killAssistsGiven;
  const hsPercent = kills > 0 ? (p.headshots / kills) * 100 : 0;
  const adr = totalRounds > 0 ? p.damageDealt / totalRounds : 0;

  return {
    playerId: p.id,
    nickname: p.name,
    kills,
    deaths,
    assists,
    kdDiff: kills - deaths,
    kdRatio: deaths > 0 ? kills / deaths : kills,
    hsPercent,
    adr,
  };
}

/**
 * Convert Grid.gg SeriesState into NormalizedMatchStats.
 * @param seriesState - Full series state from Grid.gg live-data-feed
 * @param team1ImageUrl - Optional team 1 logo URL (from PandaScore match data)
 * @param team2ImageUrl - Optional team 2 logo URL (from PandaScore match data)
 */
export function normalizeGridStats(
  seriesState: GridSeriesState,
  team1ImageUrl?: string,
  team2ImageUrl?: string,
): NormalizedMatchStats | null {
  const games = seriesState.games
    ?.filter((g) => g.finished || g.teams.some((t) => t.score > 0))
    ?.sort((a, b) => a.sequenceNumber - b.sequenceNumber);

  if (!games || games.length === 0) return null;

  // Use first game's team order as the canonical team1/team2
  const firstGame = games[0];
  if (!firstGame.teams || firstGame.teams.length < 2) return null;

  const team1Name = firstGame.teams[0].name;
  const team2Name = firstGame.teams[1].name;

  const maps: NormalizedMapStats[] = games.map((game, i) => {
    // Grid.gg team order may vary per map — match by name
    const t1 = game.teams.find((t) => t.name === team1Name) ?? game.teams[0];
    const t2 = game.teams.find((t) => t.name === team2Name) ?? game.teams[1];
    const totalRounds = t1.score + t2.score;

    return {
      mapName: game.map?.name ? formatMapName(game.map.name) : `Map ${i + 1}`,
      mapNumber: i + 1,
      team1Score: t1.score,
      team2Score: t2.score,
      team1Won: t1.won,
      team1Players: t1.players.map((p) => normalizePlayer(p, totalRounds)),
      team2Players: t2.players.map((p) => normalizePlayer(p, totalRounds)),
    };
  });

  const availableColumns: StatColumnKey[] = [
    'kills',
    'deaths',
    'assists',
    'kdDiff',
    'kdRatio',
    'hsPercent',
    'adr',
  ];

  return {
    source: 'grid',
    team1Name,
    team2Name,
    team1ImageUrl,
    team2ImageUrl,
    maps,
    availableColumns,
    hasSideSplits: false,
  };
}
