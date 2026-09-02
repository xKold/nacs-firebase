'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  computeStatus,
  type UnifiedEventDTO,
  type UnifiedEvent,
  type EventStatus,
} from '@/lib/types/events';

// ── Helpers ──

type Filter = 'all' | 'na';

type MonthGroup = { month: number; label: string; events: UnifiedEvent[] };
type YearGroup = { year: number; months: MonthGroup[] };

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function groupByYearMonth(events: UnifiedEvent[]): YearGroup[] {
  const yearMap = new Map<number, Map<number, UnifiedEvent[]>>();

  for (const e of events) {
    const date = e.beginAt ? new Date(e.beginAt) : null;
    const year = date?.getFullYear() ?? new Date().getFullYear();
    const month = date?.getMonth() ?? 0;

    if (!yearMap.has(year)) yearMap.set(year, new Map());
    const monthMap = yearMap.get(year)!;
    if (!monthMap.has(month)) monthMap.set(month, []);
    monthMap.get(month)!.push(e);
  }

  return Array.from(yearMap.entries())
    .sort(([a], [b]) => b - a)
    .map(([year, monthMap]) => ({
      year,
      months: Array.from(monthMap.entries())
        .sort(([a], [b]) => b - a)
        .map(([month, evts]) => ({
          month,
          label: MONTH_NAMES[month],
          events: evts.sort((a, b) =>
            (b.beginAt || '').localeCompare(a.beginAt || ''),
          ),
        })),
    }));
}

// ── Sub-components ──

function TierBadge({ tier }: { tier: string }) {
  const styles: Record<string, string> = {
    S: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40 shadow-yellow-500/10 shadow-sm',
    A: 'bg-accent/20 text-accent border-accent/40 shadow-accent/10 shadow-sm',
  };

  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
        styles[tier] || 'bg-text-muted/15 text-text-muted border-text-muted/30'
      }`}
    >
      {tier}-Tier
    </span>
  );
}

function EventCard({ event }: { event: UnifiedEvent }) {
  const isLive = event.status === 'live';
  const isUpcoming = event.status === 'upcoming';

  const liveStyles = isLive
    ? 'border-live/30 bg-gradient-to-r from-live/5 via-surface-hover/50 to-surface-hover/50 shadow-lg shadow-live/5'
    : 'border-border bg-surface-hover/50';

  const dateStr = event.beginAt
    ? new Date(event.beginAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const inner = (
    <div
      className={`group relative flex items-center gap-4 p-4 rounded-xl border hover:border-accent/40 hover:bg-surface-hover transition-all duration-200 ${liveStyles}`}
    >
      {isLive && (
        <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-live animate-pulse" />
      )}

      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center overflow-hidden">
        {event.leagueImageUrl ? (
          <img
            src={event.leagueImageUrl}
            alt={event.leagueName || ''}
            className="w-7 h-7 object-contain"
          />
        ) : (
          <span className="text-lg font-bold text-accent">
            {event.source === 'faceit' ? 'F' : 'CS'}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-text group-hover:text-accent transition-colors truncate">
            {event.name}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isLive && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-live">
              <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" />
              Live
            </span>
          )}
          {isUpcoming && (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-warning">
              Upcoming
            </span>
          )}
          {event.status === 'completed' && (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Completed
            </span>
          )}

          {event.tier && <TierBadge tier={event.tier} />}

          {event.tournamentCount && event.tournamentCount > 1 && (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border bg-purple-500/15 text-purple-400 border-purple-500/30">
              {event.tournamentCount} stages
            </span>
          )}

          {event.isNA && (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border bg-accent/15 text-accent border-accent/30">
              NA
            </span>
          )}

          {event.leagueName && !event.isNA && (
            <span className="text-xs text-text-muted">{event.leagueName}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {dateStr && (
          <span className="text-sm text-text-muted hidden sm:block" suppressHydrationWarning>
            {dateStr}
          </span>
        )}
        {event.external ? (
          <svg
            className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors duration-200"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-label="Opens in new tab"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5h5v5M19 5l-9 9M5 5h6v2H7v10h10v-4h2v6H5V5z" />
          </svg>
        ) : (
          <svg
            className="w-4 h-4 text-text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all duration-200"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
    </div>
  );

  if (event.external) {
    return (
      <a href={event.href} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    );
  }
  return <Link href={event.href}>{inner}</Link>;
}

function SectionHeader({
  title,
  count,
  icon,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-2 mb-3 mt-6 first:mt-0">
      {icon}
      <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
        {title}
      </h2>
      <span className="text-xs text-text-muted bg-surface-hover px-2 py-0.5 rounded-full">
        {count}
      </span>
    </div>
  );
}

function MonthSection({ label, events }: { label: string; events: UnifiedEvent[] }) {
  return (
    <div className="mt-4 first:mt-0">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2 pl-1">
        {label}
      </h3>
      <div className="flex flex-col gap-2">
        {events.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </div>
    </div>
  );
}

function YearSection({ group, expanded, onToggle }: {
  group: YearGroup;
  expanded: boolean;
  onToggle: () => void;
}) {
  const totalEvents = group.months.reduce((sum, m) => sum + m.events.length, 0);

  return (
    <div className="mt-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 py-3 px-1 text-sm font-semibold text-text-secondary hover:text-text transition-colors"
      >
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        View {group.year}
        <span className="text-xs text-text-muted font-normal">
          ({totalEvents} event{totalEvents !== 1 ? 's' : ''})
        </span>
      </button>
      {expanded && (
        <div className="pl-2">
          {group.months.map((m) => (
            <MonthSection key={m.month} label={m.label} events={m.events} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ──

export default function EventList({
  events: dtos,
  loading = false,
}: {
  events: UnifiedEventDTO[];
  loading?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());

  // Compute status client-side from timestamps on every render
  const enriched: UnifiedEvent[] = dtos.map((e) => ({
    ...e,
    status: computeStatus(e.beginAt, e.endAt),
  }));

  // Apply filter
  const filtered = filter === 'na' ? enriched.filter((e) => e.isNA) : enriched;

  // Separate active from completed
  const live = filtered.filter((e) => e.status === 'live');
  const upcoming = filtered
    .filter((e) => e.status === 'upcoming')
    .sort((a, b) => (a.beginAt || '').localeCompare(b.beginAt || ''));
  const completed = filtered.filter((e) => e.status === 'completed');

  // Group completed by year/month
  const currentYear = new Date().getFullYear();
  const currentYearCompleted = completed.filter((e) => {
    const y = e.beginAt ? new Date(e.beginAt).getFullYear() : null;
    return y === currentYear;
  });
  const priorCompleted = completed.filter((e) => {
    const y = e.beginAt ? new Date(e.beginAt).getFullYear() : null;
    return y !== null && y < currentYear;
  });

  const currentYearMonths = groupByYearMonth(currentYearCompleted)[0]?.months || [];
  const priorYearGroups = groupByYearMonth(priorCompleted);

  const toggleYear = (year: number) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border p-8">
        <div className="flex items-center gap-3 text-text-secondary">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          Loading events...
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header + Filter */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-text-secondary text-sm mt-1">
            {filtered.length} tournament{filtered.length !== 1 ? 's' : ''} across the CS2 scene
          </p>
        </div>
        <div className="flex items-center bg-surface rounded-lg border border-border p-0.5">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
              filter === 'all'
                ? 'bg-accent text-white shadow-lg shadow-accent/25'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            All Events
          </button>
          <button
            onClick={() => setFilter('na')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
              filter === 'na'
                ? 'bg-accent text-white shadow-lg shadow-accent/25'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            NA Only
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border p-6">
        {filtered.length === 0 ? (
          <p className="text-text-muted text-center py-8">No events found.</p>
        ) : (
          <>
            {/* Live */}
            <SectionHeader
              title="Live Now"
              count={live.length}
              icon={
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-live/20">
                  <span className="w-2 h-2 rounded-full bg-live animate-pulse" />
                </span>
              }
            />
            {live.length > 0 && (
              <div className="flex flex-col gap-2 mb-2">
                {live.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            )}

            {/* Upcoming */}
            <SectionHeader
              title="Upcoming"
              count={upcoming.length}
              icon={
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-warning/20">
                  <span className="w-2 h-2 rounded-full bg-warning" />
                </span>
              }
            />
            {upcoming.length > 0 && (
              <div className="flex flex-col gap-2 mb-2">
                {upcoming.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            )}

            {/* Current year - months */}
            {currentYearMonths.length > 0 && (
              <>
                <SectionHeader
                  title={String(currentYear)}
                  count={currentYearCompleted.length}
                  icon={
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-text-muted/20">
                      <span className="w-2 h-2 rounded-full bg-text-muted" />
                    </span>
                  }
                />
                {currentYearMonths.map((m) => (
                  <MonthSection key={m.month} label={m.label} events={m.events} />
                ))}
              </>
            )}

            {/* Prior years - collapsible */}
            {priorYearGroups.map((g) => (
              <YearSection
                key={g.year}
                group={g}
                expanded={expandedYears.has(g.year)}
                onToggle={() => toggleYear(g.year)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
