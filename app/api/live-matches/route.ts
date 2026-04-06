import { NextResponse } from 'next/server';
import { eseaEvents } from '@/static/esea-events';

interface LiveMatch {
  id: string | number;
  team1: string;
  team2: string;
  team1Logo: string | null;
  team2Logo: string | null;
  score1: number;
  score2: number;
  status: 'live' | 'upcoming' | 'finished';
  event: string;
  bestOf: number;
  scheduledAt: string | null;
  href: string;
  source: 'faceit' | 'pandascore';
}

const NA_KW = /north.?america|\bamerican\b|\bamericas\b|\bna\b|united.?states/i;
const SA_KW = /south.?america|latin.?america|\bsam\b|\blatam\b/i;

function isNAMatch(text: string): boolean {
  if (SA_KW.test(text)) return false;
  return NA_KW.test(text);
}

async function fetchPandaScoreMatches(): Promise<LiveMatch[]> {
  const token = process.env.PANDASCORE_API_KEY;
  if (!token) return [];

  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };

  const fetchJson = async (url: string) => {
    try {
      const res = await fetch(url, { headers, next: { revalidate: 60 } });
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  };

  const [running, upcoming, past] = await Promise.all([
    fetchJson('https://api.pandascore.co/csgo/matches/running?per_page=20&sort=scheduled_at'),
    fetchJson('https://api.pandascore.co/csgo/matches/upcoming?per_page=15&sort=scheduled_at'),
    fetchJson('https://api.pandascore.co/csgo/matches/past?per_page=10&sort=-scheduled_at'),
  ]);

  const mapMatch = (m: any, status: 'live' | 'upcoming' | 'finished'): LiveMatch | null => {
    const t1 = m.opponents?.[0]?.opponent;
    const t2 = m.opponents?.[1]?.opponent;
    if (!t1 && !t2) return null;

    const eventName = [m.league?.name, m.serie?.full_name || m.serie?.name, m.tournament?.name]
      .filter(Boolean)
      .join(': ');

    return {
      id: m.id,
      team1: t1?.acronym || t1?.name || 'TBD',
      team2: t2?.acronym || t2?.name || 'TBD',
      team1Logo: t1?.image_url || null,
      team2Logo: t2?.image_url || null,
      score1: m.results?.find((r: any) => r.team_id === t1?.id)?.score ?? 0,
      score2: m.results?.find((r: any) => r.team_id === t2?.id)?.score ?? 0,
      status,
      event: eventName,
      bestOf: m.number_of_games || 1,
      scheduledAt: m.scheduled_at || m.begin_at,
      href: `/matches/pro/match/${m.id}`,
      source: 'pandascore',
    };
  };

  const all: LiveMatch[] = [];

  // Running — show all (tier S/A) or NA only (lower tier)
  for (const m of running as any[]) {
    const text = [m.league?.name, m.serie?.full_name, m.tournament?.name].filter(Boolean).join(' ');
    const tier = m.tournament?.tier?.toLowerCase() || '';
    if (tier === 's' || tier === 'a' || isNAMatch(text)) {
      const mapped = mapMatch(m, 'live');
      if (mapped) all.push(mapped);
    }
  }

  // Upcoming — same filter
  for (const m of upcoming as any[]) {
    const text = [m.league?.name, m.serie?.full_name, m.tournament?.name].filter(Boolean).join(' ');
    const tier = m.tournament?.tier?.toLowerCase() || '';
    if (tier === 's' || tier === 'a' || isNAMatch(text)) {
      const mapped = mapMatch(m, 'upcoming');
      if (mapped) all.push(mapped);
    }
  }

  // Past — recent NA matches
  for (const m of past as any[]) {
    const text = [m.league?.name, m.serie?.full_name, m.tournament?.name].filter(Boolean).join(' ');
    const tier = m.tournament?.tier?.toLowerCase() || '';
    if (tier === 's' || tier === 'a' || isNAMatch(text)) {
      const mapped = mapMatch(m, 'finished');
      if (mapped) all.push(mapped);
    }
  }

  return all;
}

async function fetchFaceitLiveMatches(): Promise<LiveMatch[]> {
  const key = process.env.FACEIT_API_KEY;
  if (!key) return [];

  const headers = { Authorization: `Bearer ${key}`, Accept: 'application/json' };
  const matches: LiveMatch[] = [];

  // Fetch matches from active ESEA championships
  const now = Date.now();
  const activeChamps = eseaEvents.filter((e) => {
    const begin = e.beginAt ? new Date(e.beginAt).getTime() : null;
    const end = e.endAt ? new Date(e.endAt).getTime() : null;
    if (begin && now < begin) return false;
    if (end && now > end) return false;
    return true;
  });

  for (const champ of activeChamps.slice(0, 3)) {
    try {
      const res = await fetch(
        `https://open.faceit.com/data/v4/championships/${champ.id}/matches?limit=20&offset=0`,
        { headers, next: { revalidate: 60 } },
      );
      if (!res.ok) continue;
      const data = await res.json();
      for (const m of data.items || []) {
        const status = m.status?.toUpperCase();
        let matchStatus: 'live' | 'upcoming' | 'finished';
        if (status === 'ONGOING') matchStatus = 'live';
        else if (status === 'FINISHED') matchStatus = 'finished';
        else matchStatus = 'upcoming';

        // Only include live and upcoming (skip old finished)
        if (matchStatus === 'finished') continue;

        const t1 = m.teams?.faction1;
        const t2 = m.teams?.faction2;

        matches.push({
          id: m.match_id,
          team1: t1?.name || 'TBD',
          team2: t2?.name || 'TBD',
          team1Logo: null,
          team2Logo: null,
          score1: m.results?.score?.faction1 ?? 0,
          score2: m.results?.score?.faction2 ?? 0,
          status: matchStatus,
          event: champ.name,
          bestOf: 1,
          scheduledAt: m.scheduled_at ? new Date(m.scheduled_at * 1000).toISOString() : null,
          href: `/matches/match/${m.match_id}`,
          source: 'faceit',
        });
      }
    } catch {
      // continue
    }
  }

  return matches;
}

export async function GET() {
  try {
    const [psMatches, faceitMatches] = await Promise.all([
      fetchPandaScoreMatches(),
      fetchFaceitLiveMatches(),
    ]);

    const all = [...psMatches, ...faceitMatches];

    // Sort: live first, then upcoming by time, then finished
    const statusOrder: Record<string, number> = { live: 0, upcoming: 1, finished: 2 };
    all.sort((a, b) => {
      const so = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
      if (so !== 0) return so;
      return (a.scheduledAt || '').localeCompare(b.scheduledAt || '');
    });

    return NextResponse.json({ matches: all });
  } catch {
    return NextResponse.json({ matches: [] });
  }
}
