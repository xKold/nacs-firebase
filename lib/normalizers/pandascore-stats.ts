import {
  NormalizedMatchStats,
  NormalizedMapStats,
  NormalizedPlayerStat,
  StatColumnKey,
} from '../types/match-stats';
import type { PSMatchPlayerStats, PSGame } from '../pro-team-api';

function formatMapName(raw: string | null): string {
  if (!raw) return 'Unknown';
  const stripped = raw.replace(/^de_/i, '');
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

/**
 * Convert PandaScore per-player per-game stats into NormalizedMatchStats.
 * @param playerStats - Per-player stats array from /csgo/matches/{id}/players/stats
 * @param games - Game details from /csgo/matches/{id}/games (for map names + team info)
 * @param team1Name - First opponent name (from match data)
 * @param team2Name - Second opponent name
 * @param team1Id - PandaScore team1 ID (for grouping players)
 * @param team2Id - PandaScore team2 ID
 * @param team1ImageUrl - Optional logo
 * @param team2ImageUrl - Optional logo
 */
export function normalizePandaScoreStats(
  playerStats: PSMatchPlayerStats[],
  games: PSGame[],
  team1Name: string,
  team2Name: string,
  team1Id: number,
  team2Id: number,
  team1ImageUrl?: string,
  team2ImageUrl?: string,
  playerNames?: Map<number, string>,
): NormalizedMatchStats | null {
  if (!playerStats || playerStats.length === 0) return null;
  if (!games || games.length === 0) return null;

  // Sort games by position
  const sortedGames = [...games].sort((a, b) => a.position - b.position);

  // Check which stat fields are available
  let hasKast = false;
  let hasRating = false;
  let hasAdr = false;

  for (const ps of playerStats) {
    if (ps.stats.kast !== null && ps.stats.kast !== undefined) hasKast = true;
    if (ps.stats.rating !== null && ps.stats.rating !== undefined) hasRating = true;
    if (ps.stats.adr !== null && ps.stats.adr !== undefined) hasAdr = true;
  }

  const maps: NormalizedMapStats[] = sortedGames
    .filter((g) => g.finished || g.status === 'running')
    .map((game, i) => {
      // Get player stats for this game
      const gamePlayerStats = playerStats.filter((ps) => ps.game_id === game.id);
      const t1Stats = gamePlayerStats.filter((ps) => ps.team_id === team1Id);
      const t2Stats = gamePlayerStats.filter((ps) => ps.team_id === team2Id);

      // Determine scores from game winner
      const t1Won = game.winner?.id === team1Id;
      const t2Won = game.winner?.id === team2Id;

      // We don't have round scores from this endpoint, use 0
      // The map card will show the winner checkmark instead
      const team1Score = t1Won ? 1 : 0;
      const team2Score = t2Won ? 1 : 0;

      const normalizePS = (ps: PSMatchPlayerStats): NormalizedPlayerStat => {
        const kills = ps.stats.kills;
        const deaths = ps.stats.deaths;
        const assists = ps.stats.assists;
        const hsPercent = kills > 0 ? (ps.stats.headshots / kills) * 100 : 0;

        return {
          playerId: String(ps.player_id),
          nickname: playerNames?.get(ps.player_id) ?? `Player ${ps.player_id}`,
          kills,
          deaths,
          assists,
          kdDiff: kills - deaths,
          kdRatio: deaths > 0 ? kills / deaths : kills,
          hsPercent,
          adr: ps.stats.adr ?? undefined,
          kast: ps.stats.kast !== null ? (ps.stats.kast ?? undefined) : undefined,
          rating: ps.stats.rating ?? undefined,
        };
      };

      return {
        mapName: formatMapName(game.map?.name ?? null),
        mapNumber: i + 1,
        team1Score,
        team2Score,
        team1Won: t1Won,
        team1Players: t1Stats.map(normalizePS),
        team2Players: t2Stats.map(normalizePS),
      };
    });

  if (maps.length === 0) return null;

  // Build available columns
  const availableColumns: StatColumnKey[] = [
    'kills',
    'deaths',
    'assists',
    'kdDiff',
    'kdRatio',
    'hsPercent',
  ];
  if (hasAdr) availableColumns.push('adr');
  if (hasKast) availableColumns.push('kast');
  if (hasRating) availableColumns.push('rating');

  return {
    source: 'pandascore',
    team1Name,
    team2Name,
    team1ImageUrl,
    team2ImageUrl,
    maps,
    availableColumns,
    hasSideSplits: false,
  };
}
