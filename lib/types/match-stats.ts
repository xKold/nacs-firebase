/** Normalized match stats types — shared by FACEIT and HLTV data sources */

export interface NormalizedPlayerStat {
  playerId: string;
  nickname: string;
  faceitId?: string;       // FACEIT player ID for profile linking
  kills: number;
  deaths: number;
  assists: number;
  kdDiff: number;        // kills - deaths
  kdRatio: number;       // kills / deaths
  hsPercent?: number;    // 0–100
  krRatio?: number;      // kills per round
  mvps?: number;
  adr?: number;          // average damage per round
  kast?: number;         // 0–100
  rating?: number;       // HLTV rating 2.0/3.0
  tripleKills?: number;
  quadroKills?: number;
  pentaKills?: number;
}

export interface NormalizedMapStats {
  mapName: string;
  mapNumber: number;     // 1-indexed

  // Team scores
  team1Score: number;
  team2Score: number;
  team1Won: boolean;

  // Half scores (undefined if unavailable)
  team1FirstHalf?: number;
  team1SecondHalf?: number;
  team2FirstHalf?: number;
  team2SecondHalf?: number;
  team1Overtime?: number;
  team2Overtime?: number;

  // Player stats per team
  team1Players: NormalizedPlayerStat[];
  team2Players: NormalizedPlayerStat[];

  // CT/T side splits (only available from HLTV)
  team1PlayersCT?: NormalizedPlayerStat[];
  team1PlayersT?: NormalizedPlayerStat[];
  team2PlayersCT?: NormalizedPlayerStat[];
  team2PlayersT?: NormalizedPlayerStat[];
}

export interface NormalizedMatchStats {
  source: 'faceit' | 'hltv' | 'grid' | 'pandascore';

  team1Name: string;
  team2Name: string;
  team1ImageUrl?: string;
  team2ImageUrl?: string;

  maps: NormalizedMapStats[];

  /** Which stat columns are available from this data source */
  availableColumns: StatColumnKey[];

  /** Whether CT/T side player splits are available */
  hasSideSplits: boolean;
}

export type StatColumnKey =
  | 'kills'
  | 'deaths'
  | 'assists'
  | 'kdDiff'
  | 'kdRatio'
  | 'hsPercent'
  | 'krRatio'
  | 'mvps'
  | 'adr'
  | 'kast'
  | 'rating';

export interface StatColumn {
  key: StatColumnKey;
  label: string;
  shortLabel: string;
  format: (value: number | undefined) => string;
  colorFn?: (value: number | undefined) => string;  // tailwind class
  sortDescending?: boolean;
}

/** Column definitions for rendering */
export const STAT_COLUMNS: Record<StatColumnKey, StatColumn> = {
  kills: {
    key: 'kills',
    label: 'Kills',
    shortLabel: 'K',
    format: (v) => String(v ?? 0),
    colorFn: () => 'text-success',
    sortDescending: true,
  },
  deaths: {
    key: 'deaths',
    label: 'Deaths',
    shortLabel: 'D',
    format: (v) => String(v ?? 0),
    colorFn: () => 'text-live',
  },
  assists: {
    key: 'assists',
    label: 'Assists',
    shortLabel: 'A',
    format: (v) => String(v ?? 0),
    colorFn: () => 'text-text-secondary',
  },
  kdDiff: {
    key: 'kdDiff',
    label: 'K-D',
    shortLabel: '+/-',
    format: (v) => {
      const n = v ?? 0;
      return n > 0 ? `+${n}` : String(n);
    },
    colorFn: (v) => ((v ?? 0) >= 0 ? 'text-success' : 'text-live'),
    sortDescending: true,
  },
  kdRatio: {
    key: 'kdRatio',
    label: 'K/D',
    shortLabel: 'K/D',
    format: (v) => (v ?? 0).toFixed(2),
    colorFn: (v) => ((v ?? 0) >= 1.0 ? 'text-success' : 'text-live'),
    sortDescending: true,
  },
  hsPercent: {
    key: 'hsPercent',
    label: 'HS%',
    shortLabel: 'HS%',
    format: (v) => `${(v ?? 0).toFixed(1)}%`,
    colorFn: () => 'text-text-secondary',
  },
  krRatio: {
    key: 'krRatio',
    label: 'K/R',
    shortLabel: 'K/R',
    format: (v) => (v ?? 0).toFixed(2),
    colorFn: () => 'text-text-secondary',
    sortDescending: true,
  },
  mvps: {
    key: 'mvps',
    label: 'MVPs',
    shortLabel: 'MVP',
    format: (v) => String(v ?? 0),
    colorFn: () => 'text-warning',
    sortDescending: true,
  },
  adr: {
    key: 'adr',
    label: 'ADR',
    shortLabel: 'ADR',
    format: (v) => (v ?? 0).toFixed(1),
    colorFn: (v) => ((v ?? 0) >= 80 ? 'text-success' : 'text-text-secondary'),
    sortDescending: true,
  },
  kast: {
    key: 'kast',
    label: 'KAST',
    shortLabel: 'KAST',
    format: (v) => `${(v ?? 0).toFixed(1)}%`,
    colorFn: (v) => ((v ?? 0) >= 70 ? 'text-success' : 'text-text-secondary'),
    sortDescending: true,
  },
  rating: {
    key: 'rating',
    label: 'Rating',
    shortLabel: 'Rating',
    format: (v) => (v ?? 0).toFixed(2),
    colorFn: (v) => {
      const r = v ?? 0;
      if (r >= 1.1) return 'text-success';
      if (r <= 0.9) return 'text-live';
      return 'text-text-secondary';
    },
    sortDescending: true,
  },
};
