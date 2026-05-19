import { NextRequest, NextResponse } from 'next/server';
import type { SearchResponse, SearchResult } from '@/lib/types/search';

const PS_BASE = 'https://api.pandascore.co';
const FACEIT_BASE = 'https://open.faceit.com/data/v4';

async function faceitFetch(path: string) {
  const key = process.env.FACEIT_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${FACEIT_BASE}${path}`, {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function pandascoreFetch(path: string) {
  const token = process.env.PANDASCORE_API_KEY;
  if (!token) return null;
  try {
    const sep = path.includes('?') ? '&' : '?';
    const res = await fetch(`${PS_BASE}${path}${sep}token=${token}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function searchFaceitPlayers(q: string): Promise<SearchResult[]> {
  const data = await faceitFetch(
    `/search/players?nickname=${encodeURIComponent(q)}&game=cs2&limit=10`,
  );
  const items = data?.items ?? [];
  return items.map((p: any): SearchResult => ({
    id: p.player_id,
    name: p.nickname,
    source: 'faceit',
    href: `/players/${p.player_id}`,
    subtitle: p.country?.toUpperCase(),
    imageUrl: p.avatar,
  }));
}

async function searchPandascorePlayers(q: string): Promise<SearchResult[]> {
  const data = await pandascoreFetch(
    `/csgo/players?search[name]=${encodeURIComponent(q)}&per_page=10`,
  );
  if (!Array.isArray(data)) return [];
  return data.map((p: any): SearchResult => {
    const name = p.name ?? p.slug ?? '';
    return {
      id: String(p.id),
      name,
      source: 'pandascore',
      href: `/players/lookup?nick=${encodeURIComponent(name)}`,
      subtitle: p.nationality,
      imageUrl: p.image_url,
    };
  });
}

async function searchFaceitTeams(q: string): Promise<SearchResult[]> {
  const data = await faceitFetch(
    `/search/teams?name=${encodeURIComponent(q)}&game=cs2&limit=10`,
  );
  const items = data?.items ?? [];
  return items.map((t: any): SearchResult => ({
    id: t.team_id,
    name: t.name,
    source: 'faceit',
    href: `/teams/${t.team_id}`,
    imageUrl: t.avatar,
  }));
}

async function searchPandascoreTeams(q: string): Promise<SearchResult[]> {
  const data = await pandascoreFetch(
    `/csgo/teams?search[name]=${encodeURIComponent(q)}&per_page=10`,
  );
  if (!Array.isArray(data)) return [];
  return data.map((t: any): SearchResult => ({
    id: String(t.id),
    name: t.name,
    source: 'pandascore',
    href: `/teams/pro/${encodeURIComponent(t.name)}`,
    imageUrl: t.image_url,
  }));
}

async function searchFaceitChampionships(q: string): Promise<SearchResult[]> {
  const data = await faceitFetch(
    `/search/championships?name=${encodeURIComponent(q)}&game=cs2&limit=10`,
  );
  const items = data?.items ?? [];
  return items.map((c: any): SearchResult => ({
    id: c.championship_id ?? c.competition_id,
    name: c.name,
    source: 'faceit',
    href: `/matches/event/${c.championship_id ?? c.competition_id}`,
    subtitle: c.organizer_name,
    imageUrl: c.cover_image ?? c.background_image,
  }));
}

async function searchPandascoreTournaments(q: string): Promise<SearchResult[]> {
  const data = await pandascoreFetch(
    `/csgo/tournaments?search[name]=${encodeURIComponent(q)}&per_page=10&sort=-begin_at`,
  );
  if (!Array.isArray(data)) return [];
  return data.map((t: any): SearchResult => {
    const serieId = t.serie_id;
    const leagueName = t.league?.name ?? '';
    const tournamentName = t.name ?? '';
    const displayName = leagueName
      ? `${leagueName}${tournamentName ? ` — ${tournamentName}` : ''}`
      : tournamentName || 'Tournament';
    const year = t.begin_at ? new Date(t.begin_at).getFullYear().toString() : undefined;
    return {
      id: String(t.id),
      name: displayName,
      source: 'pandascore',
      href: serieId ? `/matches/pro/serie/${serieId}` : `/matches/pro/${t.id}`,
      subtitle: year,
      imageUrl: t.league?.image_url,
    };
  });
}

function dedupeByName(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const out: SearchResult[] = [];
  for (const r of results) {
    const key = r.name?.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ events: [], teams: [], players: [] } satisfies SearchResponse);
  }

  const [
    faceitPlayers,
    pandascorePlayers,
    faceitTeams,
    pandascoreTeams,
    faceitChampionships,
    pandascoreTournaments,
  ] = await Promise.all([
    searchFaceitPlayers(q),
    searchPandascorePlayers(q),
    searchFaceitTeams(q),
    searchPandascoreTeams(q),
    searchFaceitChampionships(q),
    searchPandascoreTournaments(q),
  ]);

  const payload: SearchResponse = {
    events: dedupeByName([...faceitChampionships, ...pandascoreTournaments]),
    teams: dedupeByName([...faceitTeams, ...pandascoreTeams]),
    players: dedupeByName([...faceitPlayers, ...pandascorePlayers]),
  };

  return NextResponse.json(payload);
}
