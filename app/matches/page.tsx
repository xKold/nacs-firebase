'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import RankingSidebar from '../components/RankingSidebar';

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

export default function MatchesPage() {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/live-matches')
      .then((res) => res.json())
      .then((data) => setMatches(data.matches || []))
      .catch(() => setMatches([]))
      .finally(() => setLoading(false));
  }, []);

  const live = matches.filter((m) => m.status === 'live');
  const upcoming = matches.filter((m) => m.status === 'upcoming');
  const recent = matches.filter((m) => m.status === 'finished');

  const renderMatch = (m: LiveMatch) => {
    const isLive = m.status === 'live';
    const isFinished = m.status === 'finished';

    const timeStr = m.scheduledAt
      ? new Date(m.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : '';
    const dateStr = m.scheduledAt
      ? new Date(m.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : '';

    return (
      <Link
        key={`${m.source}-${m.id}`}
        href={m.href}
        className={`relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 hover:border-accent/40 ${
          isLive
            ? 'border-live/30 bg-gradient-to-r from-live/5 via-surface-hover/50 to-surface-hover/50 shadow-lg shadow-live/5'
            : 'border-border bg-surface-hover/50'
        }`}
      >
        {isLive && <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-live animate-pulse" />}

        <div className="hidden sm:flex flex-col items-center gap-1 flex-shrink-0 w-20">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">BO{m.bestOf}</span>
          {isLive && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-live">
              <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" />Live
            </span>
          )}
          {!isLive && !isFinished && dateStr && (
            <span className="text-[11px] text-text-muted" suppressHydrationWarning>{dateStr}</span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
          <span className="font-semibold text-text truncate">{m.team1}</span>
          {m.team1Logo && <img src={m.team1Logo} alt="" className="w-7 h-7 object-contain flex-shrink-0" />}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 px-2">
          {isFinished || isLive ? (
            <>
              <span className="text-xl font-bold w-6 text-right text-text">{m.score1}</span>
              <span className="text-text-muted text-sm">-</span>
              <span className="text-xl font-bold w-6 text-left text-text">{m.score2}</span>
            </>
          ) : (
            <span className="text-sm text-text-muted font-medium px-2" suppressHydrationWarning>{timeStr || 'TBD'}</span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          {m.team2Logo && <img src={m.team2Logo} alt="" className="w-7 h-7 object-contain flex-shrink-0" />}
          <span className="font-semibold text-text truncate">{m.team2}</span>
        </div>

        <div className="hidden sm:block flex-shrink-0">
          <span className="text-[10px] text-text-muted truncate max-w-[120px] inline-block">{m.event}</span>
        </div>
      </Link>
    );
  };

  const renderSection = (title: string, items: LiveMatch[], icon: React.ReactNode) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">{title}</h2>
          <span className="text-xs text-text-muted bg-surface-hover px-2 py-0.5 rounded-full">{items.length}</span>
        </div>
        <div className="flex flex-col gap-2">{items.map(renderMatch)}</div>
      </div>
    );
  };

  return (
    <div className="relative max-w-5xl mx-auto px-4">
      {/* Rankings sidebar — positioned to the left, doesn't affect layout */}
      <div className="hidden xl:block absolute right-full mr-4 top-0 w-[200px]">
        <div className="sticky top-20">
          <RankingSidebar />
        </div>
      </div>

      {/* Main content */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Matches</h1>
          <p className="text-text-secondary text-sm mt-1">Live and upcoming NA matches</p>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border p-6">
        {loading ? (
          <div className="flex items-center gap-3 text-text-secondary py-8">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            Loading matches...
          </div>
        ) : matches.length === 0 ? (
          <p className="text-text-muted text-center py-8">No live or upcoming matches right now.</p>
        ) : (
          <>
            {renderSection('Live Now', live, (
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-live/20">
                <span className="w-2 h-2 rounded-full bg-live animate-pulse" />
              </span>
            ))}
            {renderSection('Upcoming', upcoming, (
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-warning/20">
                <span className="w-2 h-2 rounded-full bg-warning" />
              </span>
            ))}
            {renderSection('Recently Completed', recent, (
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-text-muted/20">
                <span className="w-2 h-2 rounded-full bg-text-muted" />
              </span>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
