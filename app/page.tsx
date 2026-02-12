import EventList from './components/EventList';

interface PandaScoreTournament {
  id: number;
  name: string;
  tier: string;
  begin_at: string | null;
  end_at: string | null;
  league: { id: number; name: string; url: string | null; image_url: string | null };
  serie: { id: number; full_name: string | null; name: string | null; year: number | null };
}

export interface ProEvent {
  id: string;
  name: string;
  tier: string;
  league: string;
  leagueImageUrl: string | null;
  startDate: string;
  endDate: string | null;
  status: 'ongoing' | 'upcoming' | 'completed';
  url: string | null;
  isNA: boolean;
  serieId?: number;
  tournamentCount?: number;
}

const NA_KEYWORDS = /north.?america|\bamerican\b|\bamericas\b|\bna\b|united.?states/i;
const SA_KEYWORDS = /south.?america|latin.?america|\bsam\b|\blatam\b/i;

function isNATournament(t: PandaScoreTournament): boolean {
  const text = [
    t.name,
    t.serie?.full_name,
    t.serie?.name,
    t.league?.name,
  ]
    .filter(Boolean)
    .join(' ');
  if (SA_KEYWORDS.test(text)) return false;
  return NA_KEYWORDS.test(text);
}

// Annotated tournament with pre-computed status and NA flag
interface AnnotatedTournament extends PandaScoreTournament {
  _status: 'ongoing' | 'upcoming' | 'completed';
  _isNA: boolean;
}

const TIER_RANK: Record<string, number> = { s: 0, a: 1, b: 2, c: 3, d: 4 };

function groupBySerie(tournaments: AnnotatedTournament[]): ProEvent[] {
  // Group by serie.id (fall back to tournament.id if no serie)
  const groups = new Map<string, AnnotatedTournament[]>();

  for (const t of tournaments) {
    const key = t.serie?.id ? `serie-${t.serie.id}` : `tour-${t.id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  const events: ProEvent[] = [];

  for (const [key, group] of groups) {
    if (group.length === 1) {
      // Single-tournament series: keep current behavior
      const t = group[0];
      const serieName = t.serie?.full_name || t.serie?.name || '';
      const displayName = serieName
        ? `${t.league.name}: ${serieName} - ${t.name}`
        : `${t.league.name} - ${t.name}`;

      events.push({
        id: `ps-${t.id}`,
        name: displayName,
        tier: t.tier?.toUpperCase() || '?',
        league: t.league.name,
        leagueImageUrl: t.league.image_url,
        startDate: t.begin_at || '',
        endDate: t.end_at,
        status: t._status,
        url: t.league.url,
        isNA: t._isNA,
      });
    } else {
      // Multi-tournament series: create ONE grouped event
      const first = group[0];
      const serieId = first.serie?.id;
      const serieName = first.serie?.full_name || first.serie?.name || '';
      const displayName = serieName
        ? `${first.league.name}: ${serieName}`
        : first.league.name;

      // Status aggregation: any running → ongoing, else any upcoming → upcoming, else completed
      let status: 'ongoing' | 'upcoming' | 'completed' = 'completed';
      if (group.some((t) => t._status === 'ongoing')) status = 'ongoing';
      else if (group.some((t) => t._status === 'upcoming')) status = 'upcoming';

      // Tier: highest (S > A > B > C > D)
      const bestTier = group.reduce((best, t) => {
        const rank = TIER_RANK[t.tier?.toLowerCase()] ?? 99;
        const bestRank = TIER_RANK[best?.toLowerCase()] ?? 99;
        return rank < bestRank ? t.tier : best;
      }, group[0].tier);

      // Date range: earliest begin_at → latest end_at
      const beginDates = group.map((t) => t.begin_at).filter(Boolean) as string[];
      const endDates = group.map((t) => t.end_at).filter(Boolean) as string[];
      const startDate = beginDates.length > 0
        ? beginDates.sort()[0]
        : '';
      const endDate = endDates.length > 0
        ? endDates.sort().reverse()[0]
        : null;

      // isNA: any tournament in the group is NA
      const isNA = group.some((t) => t._isNA);

      events.push({
        id: `ps-serie-${serieId}`,
        name: displayName,
        tier: bestTier?.toUpperCase() || '?',
        league: first.league.name,
        leagueImageUrl: first.league.image_url,
        startDate,
        endDate,
        status,
        url: first.league.url,
        isNA,
        serieId: serieId,
        tournamentCount: group.length,
      });
    }
  }

  return events;
}

async function fetchPandaScoreEvents(): Promise<ProEvent[]> {
  const token = process.env.PANDASCORE_API_KEY;
  if (!token) return [];

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };

  const fetchJson = async (url: string) => {
    try {
      const res = await fetch(url, { headers, next: { revalidate: 60 } });
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  };

  const base = 'https://api.pandascore.co/csgo/tournaments';
  const cs2 = 'filter%5Bvideogame_title%5D=cs-2';

  const [
    runningTop, upcomingTop, pastTop,
    runningLower, upcomingLower, pastLower,
  ] = await Promise.all([
    fetchJson(`${base}/running?${cs2}&filter%5Btier%5D=s,a&page%5Bsize%5D=15&sort=begin_at`),
    fetchJson(`${base}/upcoming?${cs2}&filter%5Btier%5D=s,a&page%5Bsize%5D=10&sort=begin_at`),
    fetchJson(`${base}/past?${cs2}&filter%5Btier%5D=s&page%5Bsize%5D=5&sort=-end_at`),
    fetchJson(`${base}/running?${cs2}&filter%5Btier%5D=b,c,d&page%5Bsize%5D=50&sort=begin_at`),
    fetchJson(`${base}/upcoming?${cs2}&filter%5Btier%5D=b,c,d&page%5Bsize%5D=20&sort=begin_at`),
    fetchJson(`${base}/past?${cs2}&filter%5Btier%5D=b,c,d&page%5Bsize%5D=10&sort=-end_at`),
  ]);

  // Filter lower-tier to NA only
  const naRunning = (runningLower as PandaScoreTournament[]).filter(isNATournament);
  const naUpcoming = (upcomingLower as PandaScoreTournament[]).filter(isNATournament);
  const naPast = (pastLower as PandaScoreTournament[]).filter(isNATournament);

  // Annotate all tournaments with status and NA flag
  const annotate = (
    tournaments: PandaScoreTournament[],
    status: 'ongoing' | 'upcoming' | 'completed',
    isNA?: boolean,
  ): AnnotatedTournament[] =>
    tournaments.map((t) => ({
      ...t,
      _status: status,
      _isNA: isNA ?? isNATournament(t),
    }));

  const allTournaments: AnnotatedTournament[] = [
    ...annotate(runningTop as PandaScoreTournament[], 'ongoing'),
    ...annotate(naRunning, 'ongoing'),
    ...annotate(upcomingTop as PandaScoreTournament[], 'upcoming'),
    ...annotate(naUpcoming, 'upcoming'),
    ...annotate(pastTop as PandaScoreTournament[], 'completed'),
    ...annotate(naPast, 'completed'),
  ];

  return groupBySerie(allTournaments);
}

export default async function Home() {
  const proEvents = await fetchPandaScoreEvents();

  return (
    <div className="max-w-5xl mx-auto px-4">
      <EventList proEvents={proEvents} />
    </div>
  );
}
