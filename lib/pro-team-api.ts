// PandaScore + Grid.gg team data for Pro Overview

// --- Types ---

export interface PSPlayer {
  id: number;
  name: string;
  first_name: string | null;
  last_name: string | null;
  age: number | null;
  nationality: string | null;
  image_url: string | null;
  role: string | null;
}

export interface PSTeamFull {
  id: number;
  name: string;
  acronym: string | null;
  location: string | null;
  image_url: string | null;
  players: PSPlayer[];
}

export interface PSMatchResult {
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
  opponents: { type: string; opponent: { id: number; name: string; acronym: string | null; image_url: string | null } }[];
  results: { score: number; team_id: number }[];
  games: { id: number; position: number; status: string; finished: boolean; winner: { id: number } | null }[];
  tournament: { id: number; name: string } | null;
  league: { id: number; name: string; image_url: string | null } | null;
  serie: { id: number; full_name: string | null; name: string | null } | null;
}

export interface GridTeam {
  id: string;
  name: string;
  logoUrl: string | null;
}

export interface GridSeries {
  id: string;
  startTimeScheduled: string | null;
  format: { nameShortened: string | null } | null;
  teams: { baseInfo: { id: string; name: string; logoUrl: string | null } }[];
  tournament: { name: string } | null;
}

export interface TournamentStanding {
  tournamentId: number;
  rank: number | null;
  status: 'ongoing' | 'upcoming' | 'finished';
}

export interface ProTeamData {
  psTeam: PSTeamFull | null;
  psMatches: PSMatchResult[];
  gridTeam: GridTeam | null;
  gridSeries: GridSeries[];
  tournamentStandings: Record<number, TournamentStanding>;
}

// --- Grid.gg Series State types (per-player match stats) ---

export interface GridGamePlayerStats {
  id: string;
  name: string;
  kills: number;
  deaths: number;
  killAssistsGiven: number;
  headshots: number;
  damageDealt: number;
}

export interface GridGameTeamStats {
  id: string;
  name: string;
  won: boolean;
  score: number;
  players: GridGamePlayerStats[];
}

export interface GridGameStats {
  id: string;
  sequenceNumber: number;
  finished: boolean;
  map: { name: string };
  teams: GridGameTeamStats[];
}

export interface GridSeriesState {
  id: string;
  finished: boolean;
  format: string;
  games: GridGameStats[];
}

// --- PandaScore ---

const PS_BASE = 'https://api.pandascore.co';

function psHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${process.env.PANDASCORE_API_KEY}`,
    Accept: 'application/json',
  };
}

export async function searchPandaScoreTeam(teamName: string): Promise<PSTeamFull | null> {
  const token = process.env.PANDASCORE_API_KEY;
  if (!token) return null;

  try {
    const url = `${PS_BASE}/csgo/teams?search[name]=${encodeURIComponent(teamName)}&per_page=10`;
    const res = await fetch(url, {
      headers: psHeaders(),
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;

    const teams = (await res.json()) as PSTeamFull[];
    if (teams.length === 0) return null;

    // Only use exact match (case-insensitive) — no fallback to avoid false positives
    const nameLower = teamName.toLowerCase();
    const exact = teams.find((t) => t.name.toLowerCase() === nameLower);
    return exact || null;
  } catch {
    return null;
  }
}

export async function fetchPandaScoreMatches(
  psTeamId: number,
  limit = 20
): Promise<PSMatchResult[]> {
  const token = process.env.PANDASCORE_API_KEY;
  if (!token) return [];

  try {
    const url = `${PS_BASE}/csgo/matches?filter[opponent_id]=${psTeamId}&filter[videogame_title]=cs-2&sort=-scheduled_at&per_page=${limit}`;
    const res = await fetch(url, {
      headers: psHeaders(),
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return (await res.json()) as PSMatchResult[];
  } catch {
    return [];
  }
}

// --- Grid.gg ---

const GRID_ENDPOINT = 'https://api-op.grid.gg/central-data/graphql';
const CS2_TITLE_ID = '28';

function gridHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-api-key': process.env.GRID_API_KEY || '',
  };
}

export async function findGridTeam(teamName: string): Promise<GridTeam | null> {
  const apiKey = process.env.GRID_API_KEY;
  if (!apiKey) return null;

  const query = `
    query FindTeam($name: String!, $titleId: ID!) {
      teams(filter: { name: { contains: $name }, titleId: $titleId }) {
        edges {
          node {
            id
            name
            logoUrl
          }
        }
      }
    }
  `;

  try {
    const res = await fetch(GRID_ENDPOINT, {
      method: 'POST',
      headers: gridHeaders(),
      body: JSON.stringify({
        query,
        variables: { name: teamName, titleId: CS2_TITLE_ID },
      }),
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;

    const json = await res.json();
    const edges = json?.data?.teams?.edges ?? [];
    const teams: GridTeam[] = edges.map((e: any) => e.node);
    if (teams.length === 0) return null;

    const nameLower = teamName.toLowerCase();
    const exact = teams.find((t) => t.name.toLowerCase() === nameLower);
    return exact || teams[0];
  } catch {
    return null;
  }
}

export async function fetchGridSeries(
  gridTeamId: string,
  limit = 20
): Promise<GridSeries[]> {
  const apiKey = process.env.GRID_API_KEY;
  if (!apiKey) return [];

  const query = `
    query TeamSeries($teamId: ID!, $titleId: ID!, $first: Int!) {
      allSeries(
        filter: { titleId: $titleId, teamId: $teamId }
        orderBy: StartTimeScheduled
        orderDirection: DESC
        first: $first
      ) {
        edges {
          node {
            id
            startTimeScheduled
            format {
              nameShortened
            }
            teams {
              baseInfo {
                id
                name
                logoUrl
              }
            }
            tournament {
              name
            }
          }
        }
      }
    }
  `;

  try {
    const res = await fetch(GRID_ENDPOINT, {
      method: 'POST',
      headers: gridHeaders(),
      body: JSON.stringify({
        query,
        variables: { teamId: gridTeamId, titleId: CS2_TITLE_ID, first: limit },
      }),
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];

    const json = await res.json();
    const edges = json?.data?.allSeries?.edges ?? [];
    return edges.map((e: any) => e.node) as GridSeries[];
  } catch {
    return [];
  }
}

// --- PandaScore Tournament Standings ---

async function fetchTournamentStanding(
  tournamentId: number,
  psTeamId: number,
): Promise<TournamentStanding> {
  const token = process.env.PANDASCORE_API_KEY;
  if (!token) return { tournamentId, rank: null, status: 'finished' };

  try {
    // Fetch tournament details + standings in parallel
    const [tournamentRes, standingsRes] = await Promise.all([
      fetch(`${PS_BASE}/tournaments/${tournamentId}`, {
        headers: psHeaders(),
        next: { revalidate: 300 },
      }),
      fetch(`${PS_BASE}/tournaments/${tournamentId}/standings`, {
        headers: psHeaders(),
        next: { revalidate: 300 },
      }),
    ]);

    // Determine tournament status from dates
    let status: 'ongoing' | 'upcoming' | 'finished' = 'finished';
    if (tournamentRes.ok) {
      const t = await tournamentRes.json();
      const now = Date.now();
      const begin = t.begin_at ? new Date(t.begin_at).getTime() : null;
      const end = t.end_at ? new Date(t.end_at).getTime() : null;
      if (begin && now < begin) status = 'upcoming';
      else if (end && now > end) status = 'finished';
      else status = 'ongoing';
    }

    // Find team's rank in standings
    let rank: number | null = null;
    if (standingsRes.ok) {
      const standings = await standingsRes.json();
      const entry = (standings as any[]).find((s) => s.team?.id === psTeamId);
      if (entry) rank = entry.rank ?? null;
    }

    return { tournamentId, rank, status };
  } catch {
    return { tournamentId, rank: null, status: 'finished' };
  }
}

// --- Grid.gg Series State (per-player stats for match detail pages) ---

const GRID_LIVE_ENDPOINT = 'https://api-op.grid.gg/live-data-feed/series-state/graphql';

/**
 * Find a Grid.gg series that matches a PandaScore match by team names + date.
 * Searches Grid.gg for team1, then looks through their recent series for one
 * that also contains team2 and falls on a matching date.
 */
export async function findGridSeriesForMatch(
  team1Name: string,
  team2Name: string,
  matchDate: string | null,
): Promise<string | null> {
  // Find team1 in Grid.gg
  const gridTeam = await findGridTeam(team1Name);
  if (!gridTeam) return null;

  // Get recent series for that team
  const series = await fetchGridSeries(gridTeam.id, 30);

  const team2Lower = team2Name.toLowerCase();
  const targetTime = matchDate ? new Date(matchDate).getTime() : null;

  for (const s of series) {
    // Check if team2 is in this series
    const hasTeam2 = s.teams.some((t) => {
      const name = t.baseInfo.name.toLowerCase();
      return name === team2Lower || name.includes(team2Lower) || team2Lower.includes(name);
    });
    if (!hasTeam2) continue;

    // Check date proximity (within 36 hours)
    if (targetTime && s.startTimeScheduled) {
      const seriesTime = new Date(s.startTimeScheduled).getTime();
      const hourDiff = Math.abs(targetTime - seriesTime) / (1000 * 60 * 60);
      if (hourDiff > 36) continue;
    }

    return s.id;
  }

  return null;
}

/**
 * Fetch full series state with per-player stats from Grid.gg's live-data-feed.
 * Returns map names, round scores, and per-player K/D/A/HS/ADR for each map.
 */
export async function fetchGridSeriesState(seriesId: string): Promise<GridSeriesState | null> {
  const apiKey = process.env.GRID_API_KEY;
  if (!apiKey) return null;

  const query = `
    query SeriesState($id: ID!) {
      seriesState(id: $id) {
        id
        finished
        format
        games {
          id
          sequenceNumber
          finished
          map { name }
          teams {
            ... on GameTeamStateCs2 {
              id
              name
              won
              score
              players {
                ... on GamePlayerStateCs2 {
                  id
                  name
                  kills
                  deaths
                  killAssistsGiven
                  headshots
                  damageDealt
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const res = await fetch(GRID_LIVE_ENDPOINT, {
      method: 'POST',
      headers: gridHeaders(),
      body: JSON.stringify({ query, variables: { id: seriesId } }),
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;

    const json = await res.json();
    return (json?.data?.seriesState as GridSeriesState) ?? null;
  } catch {
    return null;
  }
}

// --- Lightweight existence check (for tab state without fetching all matches) ---

export async function checkProTeamExists(teamName: string): Promise<boolean> {
  const [psTeam, gridTeam] = await Promise.all([
    searchPandaScoreTeam(teamName),
    findGridTeam(teamName),
  ]);
  return psTeam !== null || gridTeam !== null;
}

// --- Combined fetch ---

export async function fetchProTeamData(teamName: string): Promise<ProTeamData | null> {
  // Search both APIs in parallel for the team
  const [psTeam, gridTeam] = await Promise.all([
    searchPandaScoreTeam(teamName),
    findGridTeam(teamName),
  ]);

  // If neither API found the team, return null
  if (!psTeam && !gridTeam) return null;

  // Fetch matches/series in parallel for whichever teams were found
  const [psMatches, gridSeries] = await Promise.all([
    psTeam ? fetchPandaScoreMatches(psTeam.id) : Promise.resolve([]),
    gridTeam ? fetchGridSeries(gridTeam.id) : Promise.resolve([]),
  ]);

  // Fetch tournament standings for each unique tournament (in parallel)
  const tournamentStandings: Record<number, TournamentStanding> = {};
  if (psTeam) {
    const uniqueTournamentIds = new Set<number>();
    psMatches.forEach((m) => {
      if (m.tournament?.id) uniqueTournamentIds.add(m.tournament.id);
    });

    const standingsResults = await Promise.all(
      Array.from(uniqueTournamentIds).map((tid) =>
        fetchTournamentStanding(tid, psTeam.id)
      )
    );
    standingsResults.forEach((s) => { tournamentStandings[s.tournamentId] = s; });
  }

  return { psTeam, psMatches, gridTeam, gridSeries, tournamentStandings };
}

// --- PandaScore Match Player Stats (per-player per-game K/D/A/ADR/KAST/rating) ---

export interface PSMatchPlayerStats {
  player_id: number;
  team_id: number;
  stats: {
    kills: number;
    deaths: number;
    assists: number;
    headshots: number;
    adr: number | null;
    kast: number | null;
    rating: number | null;
  };
  game_id: number;
}

export interface PSGame {
  id: number;
  position: number;
  status: string;
  finished: boolean;
  map: { name: string | null } | null;
  winner: { id: number; type: string } | null;
  teams: { id: number; name: string }[];
}

/**
 * Fetch per-player per-game stats for a PandaScore match.
 * Note: May require Historical plan — returns null on 403.
 */
export async function fetchPandaScoreMatchPlayerStats(
  matchId: number,
): Promise<PSMatchPlayerStats[] | null> {
  const token = process.env.PANDASCORE_API_KEY;
  if (!token) return null;

  try {
    const res = await fetch(`${PS_BASE}/csgo/matches/${matchId}/players/stats`, {
      headers: psHeaders(),
      next: { revalidate: 300 },
    });
    if (res.status === 403 || res.status === 422) return null;
    if (!res.ok) return null;
    return (await res.json()) as PSMatchPlayerStats[];
  } catch {
    return null;
  }
}

/**
 * Fetch game details (map names) for a PandaScore match.
 */
export async function fetchPandaScoreMatchGames(
  matchId: number,
): Promise<PSGame[] | null> {
  const token = process.env.PANDASCORE_API_KEY;
  if (!token) return null;

  try {
    const res = await fetch(`${PS_BASE}/csgo/matches/${matchId}/games`, {
      headers: psHeaders(),
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as PSGame[];
  } catch {
    return null;
  }
}
