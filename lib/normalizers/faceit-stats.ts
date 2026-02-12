import {
  NormalizedMatchStats,
  NormalizedMapStats,
  NormalizedPlayerStat,
  StatColumnKey,
} from '../types/match-stats';

/** Parse a string | number stat value to number, returning undefined if invalid */
function parseNum(value: string | number | undefined | null): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

/** Parse optional numeric — returns undefined if not present */
function parseNumOpt(value: string | number | undefined | null): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? undefined : parsed;
}

interface FaceitPlayerStats {
  player_id: string;
  nickname: string;
  player_stats: Record<string, string | number>;
}

interface FaceitTeam {
  team_name: string;
  team_id?: string;
  team_stats: Record<string, string | number>;
  players: FaceitPlayerStats[];
}

interface FaceitRound {
  round_stats: Record<string, string>;
  teams: FaceitTeam[];
}

interface FaceitMatchStats {
  rounds: FaceitRound[];
}

function normalizePlayer(p: FaceitPlayerStats): NormalizedPlayerStat {
  const kills = parseNum(p.player_stats['Kills']);
  const deaths = parseNum(p.player_stats['Deaths']);
  const assists = parseNum(p.player_stats['Assists']);

  return {
    playerId: p.player_id,
    nickname: p.nickname,
    kills,
    deaths,
    assists,
    kdDiff: kills - deaths,
    kdRatio: deaths > 0 ? kills / deaths : kills,
    hsPercent: parseNumOpt(p.player_stats['Headshots %']),
    krRatio: parseNumOpt(p.player_stats['K/R Ratio']),
    mvps: parseNumOpt(p.player_stats['MVPs']),
    tripleKills: parseNumOpt(p.player_stats['Triple Kills']),
    quadroKills: parseNumOpt(p.player_stats['Quadro Kills']),
    pentaKills: parseNumOpt(p.player_stats['Penta Kills']),
  };
}

/**
 * Transform FACEIT match stats response into normalized format.
 * @param stats - Raw FACEIT /matches/{id}/stats response
 * @param team1Name - Faction1 team name from match details
 * @param team2Name - Faction2 team name from match details
 */
export function normalizeFaceitStats(
  stats: FaceitMatchStats,
  team1Name: string,
  team2Name: string,
): NormalizedMatchStats | null {
  if (!stats.rounds || stats.rounds.length === 0) return null;

  const maps: NormalizedMapStats[] = stats.rounds.map((round, i) => {
    const t1 = round.teams?.[0];
    const t2 = round.teams?.[1];

    const team1Score = parseNum(
      t1?.team_stats?.['Final Score'] ?? t1?.team_stats?.['FinalScore']
    );
    const team2Score = parseNum(
      t2?.team_stats?.['Final Score'] ?? t2?.team_stats?.['FinalScore']
    );

    return {
      mapName: round.round_stats?.Map || `Map ${i + 1}`,
      mapNumber: i + 1,
      team1Score,
      team2Score,
      team1Won: team1Score > team2Score,
      team1FirstHalf: parseNumOpt(t1?.team_stats?.['First Half Score']),
      team1SecondHalf: parseNumOpt(t1?.team_stats?.['Second Half Score']),
      team2FirstHalf: parseNumOpt(t2?.team_stats?.['First Half Score']),
      team2SecondHalf: parseNumOpt(t2?.team_stats?.['Second Half Score']),
      team1Overtime: parseNumOpt(t1?.team_stats?.['Overtime score']),
      team2Overtime: parseNumOpt(t2?.team_stats?.['Overtime score']),
      team1Players: (t1?.players || []).map(normalizePlayer),
      team2Players: (t2?.players || []).map(normalizePlayer),
    };
  });

  const availableColumns: StatColumnKey[] = [
    'kills',
    'deaths',
    'assists',
    'kdDiff',
    'kdRatio',
    'hsPercent',
    'krRatio',
    'mvps',
  ];

  return {
    source: 'faceit',
    team1Name,
    team2Name,
    maps,
    availableColumns,
    hasSideSplits: false,
  };
}
