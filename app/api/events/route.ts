import { NextResponse } from 'next/server';
import { eseaEvents } from '@/static/esea-events';
import type { UnifiedEventDTO } from '@/lib/types/events';

// ── PandaScore types ──

interface PSTournament {
  id: number;
  name: string;
  tier: string;
  begin_at: string | null;
  end_at: string | null;
  league: { id: number; name: string; url: string | null; image_url: string | null };
  serie: { id: number; full_name: string | null; name: string | null; year: number | null };
}

interface Annotated extends PSTournament {
  _isNA: boolean;
}

// ── NA detection ──

const NA_KW = /north.?america|\bamerican\b|\bamericas\b|\bna\b|united.?states/i;
const SA_KW = /south.?america|latin.?america|\bsam\b|\blatam\b/i;

function isNA(t: PSTournament): boolean {
  const text = [t.name, t.serie?.full_name, t.serie?.name, t.league?.name]
    .filter(Boolean)
    .join(' ');
  if (SA_KW.test(text)) return false;
  return NA_KW.test(text);
}

// ── Tier ranking ──

const TIER_RANK: Record<string, number> = { s: 0, a: 1, b: 2, c: 3, d: 4 };

// ── Group tournaments into serie-level events ──

function groupBySerie(tournaments: Annotated[]): UnifiedEventDTO[] {
  const groups = new Map<string, Annotated[]>();
  for (const t of tournaments) {
    const key = t.serie?.id ? `serie-${t.serie.id}` : `tour-${t.id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  const events: UnifiedEventDTO[] = [];

  for (const [, group] of groups) {
    const first = group[0];
    const serieId = first.serie?.id;

    if (group.length === 1) {
      const serieName = first.serie?.full_name || first.serie?.name || '';
      const displayName = serieName
        ? `${first.league.name}: ${serieName} - ${first.name}`
        : `${first.league.name} - ${first.name}`;

      events.push({
        id: `ps-${first.id}`,
        name: displayName,
        source: 'pandascore',
        beginAt: first.begin_at,
        endAt: first.end_at,
        href: serieId ? `/matches/pro/serie/${serieId}` : `/matches/pro/${first.id}`,
        leagueName: first.league.name,
        leagueImageUrl: first.league.image_url,
        tier: first.tier?.toUpperCase() || '?',
        isNA: first._isNA,
      });
    } else {
      const serieName = first.serie?.full_name || first.serie?.name || '';
      const displayName = serieName
        ? `${first.league.name}: ${serieName}`
        : first.league.name;

      const bestTier = group.reduce((best, t) => {
        const rank = TIER_RANK[t.tier?.toLowerCase()] ?? 99;
        const bestRank = TIER_RANK[best?.toLowerCase()] ?? 99;
        return rank < bestRank ? t.tier : best;
      }, group[0].tier);

      const beginDates = group.map((t) => t.begin_at).filter(Boolean) as string[];
      const endDates = group.map((t) => t.end_at).filter(Boolean) as string[];

      events.push({
        id: `ps-serie-${serieId}`,
        name: displayName,
        source: 'pandascore',
        beginAt: beginDates.length > 0 ? beginDates.sort()[0] : null,
        endAt: endDates.length > 0 ? endDates.sort().reverse()[0] : null,
        href: `/matches/pro/serie/${serieId}`,
        leagueName: first.league.name,
        leagueImageUrl: first.league.image_url,
        tier: bestTier?.toUpperCase() || '?',
        isNA: group.some((t) => t._isNA),
        tournamentCount: group.length,
      });
    }
  }

  return events;
}

// ── Fetch PandaScore tournaments ──

async function fetchPandaScore(): Promise<UnifiedEventDTO[]> {
  const token = process.env.PANDASCORE_API_KEY;
  if (!token) return [];

  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };

  const fetchJson = async (url: string) => {
    try {
      const res = await fetch(url, { headers, next: { revalidate: 300 } });
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  };

  const base = 'https://api.pandascore.co/csgo/tournaments';
  const cs2 = 'filter%5Bvideogame_title%5D=cs-2';

  const [runTop, upTop, pastTop, runLow, upLow, pastLow] = await Promise.all([
    fetchJson(`${base}/running?${cs2}&filter%5Btier%5D=s,a&page%5Bsize%5D=15&sort=begin_at`),
    fetchJson(`${base}/upcoming?${cs2}&filter%5Btier%5D=s,a&page%5Bsize%5D=10&sort=begin_at`),
    fetchJson(`${base}/past?${cs2}&filter%5Btier%5D=s&page%5Bsize%5D=5&sort=-end_at`),
    fetchJson(`${base}/running?${cs2}&filter%5Btier%5D=b,c,d&page%5Bsize%5D=50&sort=begin_at`),
    fetchJson(`${base}/upcoming?${cs2}&filter%5Btier%5D=b,c,d&page%5Bsize%5D=20&sort=begin_at`),
    fetchJson(`${base}/past?${cs2}&filter%5Btier%5D=b,c,d&page%5Bsize%5D=30&sort=-end_at`),
  ]);

  const annotate = (list: PSTournament[], forceNA?: boolean): Annotated[] =>
    list.map((t) => ({ ...t, _isNA: forceNA ?? isNA(t) }));

  const allTournaments: Annotated[] = [
    ...annotate(runTop as PSTournament[]),
    ...annotate(upTop as PSTournament[]),
    ...annotate(pastTop as PSTournament[]),
    ...(runLow as PSTournament[]).filter(isNA).map((t) => ({ ...t, _isNA: true })),
    ...(upLow as PSTournament[]).filter(isNA).map((t) => ({ ...t, _isNA: true })),
    ...(pastLow as PSTournament[]).filter(isNA).map((t) => ({ ...t, _isNA: true })),
  ];

  return groupBySerie(allTournaments);
}

// ── Fetch NA-specific series by league ID (Fragadelphia, D2 Eagle Masters, etc.) ──

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

const MULTI_REGION_LEAGUES: Record<number, string[]> = {
  4734: ['North America'], // ESL Challenger League
};
const MULTI_REGION_LEAGUE_IDS = Object.keys(MULTI_REGION_LEAGUES).map(Number);

interface PSSeries {
  id: number;
  name: string | null;
  full_name: string | null;
  year: number | null;
  begin_at: string | null;
  end_at: string | null;
  tier: string;
  league_id: number;
  league: { id: number; name: string; image_url: string | null };
}

async function fetchNALeagueSeries(): Promise<UnifiedEventDTO[]> {
  const token = process.env.PANDASCORE_API_KEY;
  if (!token) return [];

  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };

  const allLeagueIds = [...NA_LEAGUE_IDS, ...MULTI_REGION_LEAGUE_IDS];
  const leaguePromises = allLeagueIds.map(async (leagueId) => {
    try {
      const res = await fetch(
        `https://api.pandascore.co/csgo/series?filter[league_id]=${leagueId}&sort=-begin_at&per_page=15`,
        { headers, next: { revalidate: 300 } },
      );
      if (!res.ok) return [];
      return (await res.json()) as PSSeries[];
    } catch {
      return [];
    }
  });

  const results = await Promise.all(leaguePromises);
  const allSeries = results.flat().filter((s) => {
    if ((s.year ?? 0) < 2024) return false;
    const regionFilter = MULTI_REGION_LEAGUES[s.league_id];
    if (regionFilter) {
      const name = (s.full_name || s.name || '').toLowerCase();
      return regionFilter.some((kw) => name.includes(kw.toLowerCase()));
    }
    return true;
  });

  return allSeries.map((s) => ({
    id: `ps-serie-${s.id}`,
    name: `${s.league.name}: ${s.full_name || s.name || s.year || ''}`.trim(),
    source: 'pandascore' as const,
    beginAt: s.begin_at,
    endAt: s.end_at,
    href: `/matches/pro/serie/${s.id}`,
    leagueName: s.league.name,
    leagueImageUrl: s.league.image_url,
    tier: s.tier?.toUpperCase() || '?',
    isNA: true,
  }));
}

// ── Map ESEA config entries ──

function mapEseaEvents(): UnifiedEventDTO[] {
  return eseaEvents.map((e) => ({
    id: e.id,
    name: e.name,
    source: 'faceit' as const,
    beginAt: e.beginAt,
    endAt: e.endAt,
    href: `/matches/event/${e.id}`,
    isNA: true,
    region: e.region,
  }));
}

// ── Route handler ──

export async function GET() {
  try {
    const [psTournaments, psLeagueSeries, faceitEvents] = await Promise.all([
      fetchPandaScore(),
      fetchNALeagueSeries(),
      Promise.resolve(mapEseaEvents()),
    ]);

    // Merge, deduplicating by serie ID across both sources
    const seen = new Set<string>();
    const seenSerieIds = new Set<string>();
    const all: UnifiedEventDTO[] = [];

    for (const e of psTournaments) {
      seen.add(e.id);
      // Track serie IDs from tournament-based results for cross-source dedup
      const serieMatch = e.id.match(/^ps-serie-(\d+)$/);
      if (serieMatch) seenSerieIds.add(serieMatch[1]);
      // Also extract serie ID from single-tournament events that belong to a serie
      const href = e.href;
      const serieHrefMatch = href.match(/\/serie\/(\d+)$/);
      if (serieHrefMatch) seenSerieIds.add(serieHrefMatch[1]);
      all.push(e);
    }
    for (const e of psLeagueSeries) {
      // Skip if this serie was already added from tournaments
      const serieIdMatch = e.id.match(/^ps-serie-(\d+)$/);
      if (serieIdMatch && seenSerieIds.has(serieIdMatch[1])) continue;
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      all.push(e);
    }
    for (const e of faceitEvents) {
      all.push(e);
    }

    // Sort by beginAt descending (newest first)
    all.sort((a, b) => {
      const aDate = a.beginAt || '';
      const bDate = b.beginAt || '';
      return bDate.localeCompare(aDate);
    });

    return NextResponse.json({ events: all });
  } catch {
    return NextResponse.json({ events: [] });
  }
}
