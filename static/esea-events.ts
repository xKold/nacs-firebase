export interface EseaEventConfig {
  id: string;
  name: string;
  region: string;
  beginAt: string | null;
  endAt: string | null;
  /**
   * Set for entries that should link out to FACEIT.com instead of the internal
   * /matches/event/[championshipId] route.
   *
   * Used only when FACEIT's public data API cannot serve the event's matches
   * (e.g., S59 which is upcoming and has no championship yet, or older seasons
   * whose championship IDs are no longer discoverable via team-leagues/v2).
   */
  externalUrl?: string;
}

// FACEIT ESEA League structure (from their new League URL format)
const ESEA_LEAGUE_ID = 'a14b8616-45b9-4581-8637-4dfd0b5f6af8';
const S59_SEASON_ID = '71f19bf6-4032-4b65-8b4a-6f98a6d271d3';

const s59ExternalUrl =
  `https://www.faceit.com/en/cs2/league/esea%20league/${ESEA_LEAGUE_ID}/${S59_SEASON_ID}`;
const eseaLeagueLandingUrl =
  `https://www.faceit.com/en/cs2/league/esea%20league/${ESEA_LEAGUE_ID}`;

export const eseaEvents: EseaEventConfig[] = [
  // S59 NA Advanced — upcoming (no matches yet; link to FACEIT season page)
  {
    id: 'esea-s59-na-advanced',
    name: 'ESEA S59 NA Advanced',
    region: 'North America',
    beginAt: '2026-10-05T04:00:00Z',
    endAt: '2026-12-20T21:00:00Z',
    externalUrl: s59ExternalUrl,
  },
  // S58 NA Advanced — Playoffs (live)
  //   FACEIT championship: S58 NA Advanced Central - Playoffs (double elimination)
  {
    id: '6b344cab-2163-4622-ae13-fc41af4624d2',
    name: 'ESEA S58 NA Advanced - Playoffs',
    region: 'North America',
    beginAt: '2026-08-25T00:00:00Z',
    endAt: null, // in progress
  },
  // S58 NA Advanced — Regular Season (complete)
  //   FACEIT championship: S58 NA Advanced Central - Regular Season (swiss)
  {
    id: '3481bbef-1c65-415d-8686-4c0474714dad',
    name: 'ESEA S58 NA Advanced - Regular Season',
    region: 'North America',
    beginAt: '2026-07-11T04:00:00Z',
    endAt: '2026-08-25T00:00:00Z',
  },
  // S57 NA Advanced — ended
  //   FACEIT team-leagues/v2 no longer exposes S57 stages, so its championship
  //   IDs are not discoverable. Falls back to the ESEA league landing page.
  {
    id: 'esea-s57-na-advanced',
    name: 'ESEA S57 NA Advanced',
    region: 'North America',
    beginAt: '2026-04-05T22:00:00Z',
    endAt: '2026-06-22T08:00:00Z',
    externalUrl: eseaLeagueLandingUrl,
  },
  // Other FACEIT championships — still using the classic championships API
  {
    id: '846911c3-a662-41d7-8f45-973ef4e873bf',
    name: 'IEM Atlanta 2026 - Americas Open Qualifier',
    region: 'North America',
    beginAt: '2026-02-07T00:00:00Z',
    endAt: '2026-02-10T00:00:00Z',
  },
  {
    id: 'edcde162-bd82-4226-9c24-79ce537d80ec',
    name: 'PrizePicks NA Revival Series February 2026',
    region: 'North America',
    beginAt: '2026-02-13T00:00:00Z',
    endAt: '2026-02-16T00:00:00Z',
  },
  {
    id: 'f56331e8-131a-4c50-b7db-eec8b010ff98',
    name: 'Off Season Shenanigans S8',
    region: 'North America',
    beginAt: '2025-06-01T00:00:00Z',
    endAt: '2025-07-01T00:00:00Z',
  },
  {
    id: '81e36970-81ec-4e53-b2af-c0a1c0b52938',
    name: 'Off Season Shenanigans S8 Playoffs',
    region: 'North America',
    beginAt: '2025-07-01T00:00:00Z',
    endAt: '2025-08-01T00:00:00Z',
  },
];
