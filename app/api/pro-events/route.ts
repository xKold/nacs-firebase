import { NextResponse } from 'next/server';

// PandaScore league IDs for NA / pro events
const NA_LEAGUE_IDS = [
  4641, // Fragadelphia
  5307, // Fragadelphia Tap Cup
  4482, // Dust2.us (D2 Eagle Masters)
  4850, // CCT North America
  4764, // Ace North American Masters
  5478, // fl0m's Mythical LAN
  4984, // ESEA Cash Cup Circuit
  5426, // BLAST Bounty
  5386, // BLAST Rivals
];

// Leagues that span multiple regions — only show series with these keywords
const MULTI_REGION_LEAGUES: Record<number, string[]> = {
  4734: ['North America'],  // ESL Challenger League
};
const MULTI_REGION_LEAGUE_IDS = Object.keys(MULTI_REGION_LEAGUES).map(Number);

interface PSSeries {
  id: number;
  name: string | null;
  full_name: string | null;
  season: string | null;
  year: number | null;
  begin_at: string | null;
  end_at: string | null;
  tier: string;
  league_id: number;
  league: {
    id: number;
    name: string;
    image_url: string | null;
  };
}

export async function GET() {
  const token = process.env.PANDASCORE_API_KEY;
  if (!token) {
    return NextResponse.json({ series: [] });
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };

  try {
    // Fetch series for all tracked leagues in parallel
    const allLeagueIds = [...NA_LEAGUE_IDS, ...MULTI_REGION_LEAGUE_IDS];
    const leaguePromises = allLeagueIds.map(async (leagueId) => {
      const res = await fetch(
        `https://api.pandascore.co/csgo/series?filter[league_id]=${leagueId}&sort=-begin_at&per_page=15`,
        { headers, next: { revalidate: 300 } },
      );
      if (!res.ok) return [];
      return (await res.json()) as PSSeries[];
    });

    const results = await Promise.all(leaguePromises);
    // Only include series from 2024 onwards, and filter multi-region leagues to NA only
    const allSeries = results.flat().filter((s) => {
      if ((s.year ?? 0) < 2024) return false;
      const regionFilter = MULTI_REGION_LEAGUES[s.league_id];
      if (regionFilter) {
        const name = (s.full_name || s.name || '').toLowerCase();
        return regionFilter.some((kw) => name.includes(kw.toLowerCase()));
      }
      return true;
    });

    // Sort by begin_at descending
    allSeries.sort((a, b) => {
      const aDate = a.begin_at || '';
      const bDate = b.begin_at || '';
      return bDate.localeCompare(aDate);
    });

    // Map to a simple format
    const series = allSeries.map((s) => {
      const now = Date.now();
      const begin = s.begin_at ? new Date(s.begin_at).getTime() : null;
      const end = s.end_at ? new Date(s.end_at).getTime() : null;
      let status: 'upcoming' | 'ongoing' | 'completed' = 'completed';
      if (begin && now < begin) status = 'upcoming';
      else if (end && now > end) status = 'completed';
      else if (begin) status = 'ongoing';

      return {
        id: s.id,
        name: s.full_name || s.name || `${s.league.name} ${s.year || ''}`.trim(),
        leagueName: s.league.name,
        leagueImageUrl: s.league.image_url,
        leagueId: s.league.id,
        beginAt: s.begin_at,
        endAt: s.end_at,
        year: s.year,
        tier: s.tier,
        status,
      };
    });

    return NextResponse.json({ series });
  } catch {
    return NextResponse.json({ series: [] });
  }
}
