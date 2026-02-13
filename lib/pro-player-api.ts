// PandaScore + Grid.gg player data for Pro Overview on player pages

import {
  fetchPandaScoreMatches,
  searchPandaScoreTeam,
  findGridTeam,
  fetchGridSeries,
  fetchGridSeriesState,
  type PSMatchResult,
  type TournamentStanding,
  type GridTeam,
  type GridSeries,
} from './pro-team-api';

const PS_BASE = 'https://api.pandascore.co';

function psHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${process.env.PANDASCORE_API_KEY}`,
    Accept: 'application/json',
  };
}

// --- Types ---

export interface PSPlayerDetail {
  id: number;
  name: string;
  first_name: string | null;
  last_name: string | null;
  age: number | null;
  nationality: string | null;
  image_url: string | null;
  role: string | null;
  current_team: {
    id: number;
    name: string;
    acronym: string | null;
    image_url: string | null;
  } | null;
}

export interface PSPlayerCareerStats {
  adr: number | null;
  kast: number | null;
  rating: number | null;
  kills_per_round: number | null;
  deaths_per_round: number | null;
  headshot_percentage: number | null;
}

export interface ComputedPlayerStats {
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  totalHeadshots: number;
  totalDamage: number;
  totalRounds: number;
  mapsPlayed: number;
}

export interface ProPlayerData {
  psPlayer: PSPlayerDetail | null;
  currentTeam: { id: number; name: string; acronym: string | null; image_url: string | null } | null;
  psMatches: PSMatchResult[];
  tournamentStandings: Record<number, TournamentStanding>;
  careerStats: PSPlayerCareerStats | null;
  computedStats: ComputedPlayerStats | null;
  gridTeam: GridTeam | null;
  gridSeries: GridSeries[];
}

// --- API Functions ---

/**
 * Search PandaScore for a CS2 player by name.
 */
export async function searchPandaScorePlayer(
  name: string,
): Promise<PSPlayerDetail | null> {
  const token = process.env.PANDASCORE_API_KEY;
  if (!token) return null;

  try {
    const url = `${PS_BASE}/csgo/players?search[name]=${encodeURIComponent(name)}&per_page=10`;
    const res = await fetch(url, {
      headers: psHeaders(),
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;

    const players = (await res.json()) as PSPlayerDetail[];
    if (players.length === 0) return null;

    // Only use exact match (case-insensitive) — no fallback to avoid false positives
    const nameLower = name.toLowerCase();
    const exact = players.find((p) => p.name.toLowerCase() === nameLower);
    return exact || null;
  } catch {
    return null;
  }
}

/**
 * Fetch career stats for a PandaScore player.
 * May return null on 403 (requires higher-tier plan).
 */
export async function fetchPandaScorePlayerStats(
  playerId: number,
): Promise<PSPlayerCareerStats | null> {
  const token = process.env.PANDASCORE_API_KEY;
  if (!token) return null;

  try {
    const url = `${PS_BASE}/csgo/players/${playerId}/stats?videogame_title=cs-2`;
    const res = await fetch(url, {
      headers: psHeaders(),
      next: { revalidate: 300 },
    });
    if (res.status === 403 || res.status === 422) return null;
    if (!res.ok) return null;

    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const s = data[0];
      return {
        adr: s.averages?.adr ?? s.adr ?? null,
        kast: s.averages?.kast ?? s.kast ?? null,
        rating: s.averages?.rating ?? s.rating ?? null,
        kills_per_round: s.averages?.kills_per_round ?? null,
        deaths_per_round: s.averages?.deaths_per_round ?? null,
        headshot_percentage: s.averages?.headshot_percentage ?? s.headshot_percentage ?? null,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Lightweight check: does a pro player or their team exist?
 * Checks PandaScore player search + team search via FACEIT team names.
 */
export async function checkProPlayerExists(
  name: string,
  faceitTeamNames?: string[],
): Promise<boolean> {
  // Check PandaScore player
  const playerPromise = searchPandaScorePlayer(name);

  // Also check if any FACEIT team is in PandaScore AND player is on roster
  // Grid.gg is not checked here because it has no roster data to verify against
  const nameLower = name.toLowerCase();
  const teamChecks: Promise<boolean>[] = (faceitTeamNames ?? []).map(async (teamName) => {
    const psTeam = await searchPandaScoreTeam(teamName);
    if (!psTeam) return false;
    // Verify player is actually on the team's roster
    return psTeam.players?.some(
      (p) => p.name.toLowerCase() === nameLower
    ) ?? false;
  });

  const [player, ...teamResults] = await Promise.all([playerPromise, ...teamChecks]);
  return player !== null || teamResults.some(Boolean);
}

// --- Tournament Standings (reuse pattern from pro-team-api) ---

async function fetchTournamentStanding(
  tournamentId: number,
  psTeamId: number,
): Promise<TournamentStanding> {
  const token = process.env.PANDASCORE_API_KEY;
  if (!token) return { tournamentId, rank: null, status: 'finished' };

  try {
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

/**
 * Combined fetch with team-based fallback:
 * 1. Search PandaScore for the player by nickname
 * 2. Collect team IDs from: PandaScore player's current_team + searching FACEIT team names
 * 3. Fetch matches for ALL found team IDs (limit 50)
 * 4. Also search Grid.gg for teams to get series data
 * 5. Return data even if PandaScore player not found (team-based results)
 */
export async function fetchProPlayerData(
  name: string,
  faceitTeamNames?: string[],
): Promise<ProPlayerData | null> {
  // 1. Search PandaScore for the player
  const psPlayer = await searchPandaScorePlayer(name);
  const currentTeam = psPlayer?.current_team ?? null;

  // 2. Collect all PandaScore team IDs we can find
  const psTeamIds = new Set<number>();
  const psTeamMap = new Map<number, { name: string; acronym: string | null; image_url: string | null }>();

  if (currentTeam) {
    psTeamIds.add(currentTeam.id);
    psTeamMap.set(currentTeam.id, currentTeam);
  }

  // Search PandaScore for each FACEIT team name (in parallel)
  // Only include teams where the player is actually on the roster
  const teamNames = faceitTeamNames ?? [];
  const nameLowerForRoster = name.toLowerCase();
  const teamSearches = await Promise.all(
    teamNames.map((tn) => searchPandaScoreTeam(tn))
  );
  for (const psTeam of teamSearches) {
    if (psTeam && !psTeamIds.has(psTeam.id)) {
      // Verify player is on this team's roster
      const onRoster = psTeam.players?.some(
        (p) => p.name.toLowerCase() === nameLowerForRoster
      );
      if (!onRoster) continue;
      psTeamIds.add(psTeam.id);
      psTeamMap.set(psTeam.id, {
        name: psTeam.name,
        acronym: psTeam.acronym,
        image_url: psTeam.image_url,
      });
    }
  }

  // 3. Only search Grid.gg if we already have a verified PandaScore player or team
  // This prevents false positives from Grid.gg team name matching
  let gridTeam: GridTeam | null = null;
  if (psPlayer || psTeamIds.size > 0) {
    const gridSearchNames = new Set<string>();
    if (currentTeam) gridSearchNames.add(currentTeam.name);
    // Only search FACEIT team names that were verified on PandaScore roster
    for (const [tid, teamInfo] of psTeamMap) {
      gridSearchNames.add(teamInfo.name);
    }
    for (const gName of gridSearchNames) {
      gridTeam = await findGridTeam(gName);
      if (gridTeam) break;
    }
  }

  // If we have no teams at all and no player, bail out
  if (!psPlayer && psTeamIds.size === 0 && !gridTeam) return null;

  // 4. Fetch matches for ALL team IDs in parallel (higher limit: 50)
  const matchPromises = Array.from(psTeamIds).map((tid) =>
    fetchPandaScoreMatches(tid, 50)
  );

  const gridSeriesPromise = gridTeam
    ? fetchGridSeries(gridTeam.id, 30)
    : Promise.resolve([]);

  const careerStatsPromise = psPlayer
    ? fetchPandaScorePlayerStats(psPlayer.id)
    : Promise.resolve(null);

  const [matchArrays, gridSeries, careerStats] = await Promise.all([
    Promise.all(matchPromises),
    gridSeriesPromise,
    careerStatsPromise,
  ]);

  // 5. Merge & dedup matches (by match ID)
  const seenMatchIds = new Set<number>();
  const psMatches: PSMatchResult[] = [];
  for (const matches of matchArrays) {
    for (const m of matches) {
      if (!seenMatchIds.has(m.id)) {
        seenMatchIds.add(m.id);
        psMatches.push(m);
      }
    }
  }
  // Sort by date descending
  psMatches.sort((a, b) => {
    const aDate = a.scheduled_at || a.begin_at || '';
    const bDate = b.scheduled_at || b.begin_at || '';
    return bDate.localeCompare(aDate);
  });

  // 6. Use the primary team (current_team if available, else first found PS team)
  const primaryTeamId = currentTeam?.id ?? (psTeamIds.size > 0 ? Array.from(psTeamIds)[0] : 0);

  // 7. Fetch tournament standings
  const tournamentStandings: Record<number, TournamentStanding> = {};
  if (primaryTeamId) {
    const uniqueTournamentIds = new Set<number>();
    psMatches.forEach((m) => {
      if (m.tournament?.id) uniqueTournamentIds.add(m.tournament.id);
    });

    const standingsResults = await Promise.all(
      Array.from(uniqueTournamentIds).map((tid) =>
        fetchTournamentStanding(tid, primaryTeamId)
      )
    );
    standingsResults.forEach((s) => {
      tournamentStandings[s.tournamentId] = s;
    });
  }

  // 8. Compute aggregate stats from Grid.gg series states (fallback for career stats)
  let computedStats: ComputedPlayerStats | null = null;
  if (gridSeries.length > 0 && !careerStats) {
    const recentSeries = gridSeries.slice(0, 8);
    const seriesStates = await Promise.all(
      recentSeries.map((s) => fetchGridSeriesState(s.id))
    );

    const nameLower = name.toLowerCase();
    let totalKills = 0, totalDeaths = 0, totalAssists = 0;
    let totalHeadshots = 0, totalDamage = 0, totalRounds = 0, mapsPlayed = 0;

    for (const state of seriesStates) {
      if (!state?.games) continue;
      for (const game of state.games) {
        if (!game.finished) continue;
        for (const team of game.teams) {
          const player = team.players.find((p) => p.name.toLowerCase() === nameLower);
          if (player) {
            const rounds = game.teams.reduce((sum, t) => sum + t.score, 0);
            totalKills += player.kills;
            totalDeaths += player.deaths;
            totalAssists += player.killAssistsGiven;
            totalHeadshots += player.headshots;
            totalDamage += player.damageDealt;
            totalRounds += rounds;
            mapsPlayed++;
            break;
          }
        }
      }
    }

    if (mapsPlayed > 0) {
      computedStats = { totalKills, totalDeaths, totalAssists, totalHeadshots, totalDamage, totalRounds, mapsPlayed };
    }
  }

  // Build currentTeam from whatever we found
  const resolvedTeam = currentTeam
    ?? (primaryTeamId && psTeamMap.has(primaryTeamId)
      ? { id: primaryTeamId, ...psTeamMap.get(primaryTeamId)! }
      : null);

  return {
    psPlayer,
    currentTeam: resolvedTeam,
    psMatches,
    tournamentStandings,
    careerStats,
    computedStats,
    gridTeam,
    gridSeries,
  };
}
