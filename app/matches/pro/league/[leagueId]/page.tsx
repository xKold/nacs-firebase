import Link from 'next/link';

interface PSSeries {
  id: number;
  name: string | null;
  full_name: string | null;
  season: string | null;
  year: number | null;
  begin_at: string | null;
  end_at: string | null;
  tier: string;
}

interface PSLeague {
  id: number;
  name: string;
  image_url: string | null;
}

async function fetchLeagueData(leagueId: string) {
  const token = process.env.PANDASCORE_API_KEY;
  if (!token) return null;

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };

  try {
    const [leagueRes, seriesRes] = await Promise.all([
      fetch(`https://api.pandascore.co/csgo/leagues/${leagueId}`, {
        headers,
        next: { revalidate: 300 },
      }),
      fetch(
        `https://api.pandascore.co/csgo/series?filter[league_id]=${leagueId}&sort=-begin_at&per_page=25`,
        { headers, next: { revalidate: 300 } },
      ),
    ]);

    if (!leagueRes.ok) return null;

    const league = (await leagueRes.json()) as PSLeague;
    const series = seriesRes.ok ? ((await seriesRes.json()) as PSSeries[]) : [];

    return { league, series };
  } catch {
    return null;
  }
}

export default async function Page({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params;
  const data = await fetchLeagueData(leagueId);

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto px-4">
        <div className="bg-surface rounded-xl border border-border p-8">
          <p className="text-live">League not found.</p>
          <Link href="/matches" className="text-accent hover:underline mt-4 inline-block">
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const { league, series } = data;
  const now = Date.now();

  // Split by status
  const upcoming = series.filter((s) => {
    const begin = s.begin_at ? new Date(s.begin_at).getTime() : null;
    return begin && now < begin;
  });
  const ongoing = series.filter((s) => {
    const begin = s.begin_at ? new Date(s.begin_at).getTime() : null;
    const end = s.end_at ? new Date(s.end_at).getTime() : null;
    return begin && now >= begin && (!end || now <= end);
  });
  const completed = series.filter((s) => {
    const end = s.end_at ? new Date(s.end_at).getTime() : null;
    return end && now > end;
  });

  const renderSeries = (s: PSSeries) => {
    const begin = s.begin_at ? new Date(s.begin_at).getTime() : null;
    const end = s.end_at ? new Date(s.end_at).getTime() : null;
    let status: 'upcoming' | 'ongoing' | 'completed' = 'completed';
    if (begin && now < begin) status = 'upcoming';
    else if (end && now > end) status = 'completed';
    else if (begin) status = 'ongoing';

    const dateRange = [
      s.begin_at
        ? new Date(s.begin_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : null,
      s.end_at
        ? new Date(s.end_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : null,
    ]
      .filter(Boolean)
      .join(' — ');

    return (
      <Link
        key={s.id}
        href={`/matches/pro/serie/${s.id}`}
        className="group flex items-center justify-between p-4 rounded-lg bg-surface border border-border hover:border-accent/40 hover:bg-surface-hover transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          {league.image_url && (
            <img src={league.image_url} alt="" className="w-5 h-5 object-contain" />
          )}
          <span className="font-semibold text-text group-hover:text-accent transition-colors">
            {s.full_name || s.name || `Season ${s.season}`}
          </span>
          {s.year && <span className="text-xs text-text-muted">{s.year}</span>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted" suppressHydrationWarning>
            {dateRange}
          </span>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              status === 'ongoing'
                ? 'bg-live/10 text-live'
                : status === 'upcoming'
                  ? 'bg-warning/10 text-warning'
                  : 'bg-success/10 text-success'
            }`}
          >
            {status === 'ongoing' ? 'Live' : status === 'upcoming' ? 'Upcoming' : 'Completed'}
          </span>
        </div>
      </Link>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4">
      <Link href="/matches" className="text-accent hover:underline text-sm mb-4 inline-block">
        &larr; Back to Events
      </Link>

      {/* League Header */}
      <div className="bg-surface rounded-xl border border-border p-6 mb-6">
        <div className="flex items-center gap-4">
          {league.image_url && (
            <img src={league.image_url} alt={league.name} className="w-14 h-14 object-contain" />
          )}
          <div>
            <h1 className="text-2xl font-bold">{league.name}</h1>
            <span className="text-sm text-text-muted">{series.length} events</span>
          </div>
        </div>
      </div>

      {/* Ongoing */}
      {ongoing.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-live" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">Live</h2>
          </div>
          <div className="flex flex-col gap-3">{ongoing.map(renderSeries)}</div>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-warning" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">Upcoming</h2>
          </div>
          <div className="flex flex-col gap-3">{upcoming.map(renderSeries)}</div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-success" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">Completed</h2>
          </div>
          <div className="flex flex-col gap-3">{completed.map(renderSeries)}</div>
        </div>
      )}
    </div>
  );
}
