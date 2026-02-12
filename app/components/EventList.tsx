'use client';

import { useState } from 'react';
import Link from 'next/link';
import { events, Event } from '../../static/events';
import type { ProEvent } from '../page';

type Filter = 'all' | 'na';
type UnifiedEvent = {
  id: string;
  name: string;
  status: 'ongoing' | 'upcoming' | 'completed';
  startDate: string;
  isNA: boolean;
  tier?: string;
  league?: string;
  leagueImageUrl?: string | null;
  region?: string;
  href?: string;
  externalUrl?: string | null;
  source: 'faceit' | 'pandascore';
  tournamentCount?: number;
};

function toUnified(event: Event): UnifiedEvent {
  let href: string | undefined;
  let externalUrl: string | null = null;

  if (event.type === 'external') {
    externalUrl = event.externalUrl || null;
  } else if (event.type === 'championship') {
    href = `/matches/event/${event.id}`;
  } else {
    href = `/matches/events/${event.leagueId}?season=${event.seasonId}`;
  }

  return {
    id: event.id,
    name: event.name,
    status: event.status,
    startDate: event.startDate,
    isNA: true,
    region: event.region,
    href,
    externalUrl,
    source: 'faceit',
  };
}

function proToUnified(event: ProEvent): UnifiedEvent {
  // Detect serie-grouped events: id starts with "ps-serie-"
  let href: string;
  if (event.id.startsWith('ps-serie-')) {
    const serieId = event.id.replace('ps-serie-', '');
    href = `/matches/pro/serie/${serieId}`;
  } else {
    const psId = event.id.replace('ps-', '');
    href = `/matches/pro/${psId}`;
  }

  return {
    id: event.id,
    name: event.name,
    status: event.status,
    startDate: event.startDate,
    isNA: event.isNA,
    tier: event.tier,
    league: event.league,
    leagueImageUrl: event.leagueImageUrl,
    href,
    source: 'pandascore',
    tournamentCount: event.tournamentCount,
  };
}

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
  const isLive = event.status === 'ongoing';
  const isUpcoming = event.status === 'upcoming';

  const liveStyles = isLive
    ? 'border-live/30 bg-gradient-to-r from-live/5 via-surface-hover/50 to-surface-hover/50 shadow-lg shadow-live/5'
    : 'border-border bg-surface-hover/50';

  const dateStr = event.startDate
    ? new Date(event.startDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const inner = (
    <div
      className={`group relative flex items-center gap-4 p-4 rounded-xl border hover:border-accent/40 hover:bg-surface-hover transition-all duration-200 ${liveStyles}`}
    >
      {/* Live glow bar */}
      {isLive && (
        <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-live animate-pulse" />
      )}

      {/* League icon or status indicator */}
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center overflow-hidden">
        {event.leagueImageUrl ? (
          <img
            src={event.leagueImageUrl}
            alt={event.league || ''}
            className="w-7 h-7 object-contain"
          />
        ) : (
          <span className="text-lg font-bold text-accent">
            {event.source === 'faceit' ? 'F' : 'CS'}
          </span>
        )}
      </div>

      {/* Event info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-text group-hover:text-accent transition-colors truncate">
            {event.name}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status badge */}
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

          {/* Tier */}
          {event.tier && <TierBadge tier={event.tier} />}

          {/* Stages badge for multi-tournament series */}
          {event.tournamentCount && event.tournamentCount > 1 && (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border bg-purple-500/15 text-purple-400 border-purple-500/30">
              {event.tournamentCount} stages
            </span>
          )}

          {/* NA tag */}
          {event.isNA && (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border bg-accent/15 text-accent border-accent/30">
              NA
            </span>
          )}

          {/* Region or league */}
          {event.region && (
            <span className="text-xs text-text-muted">{event.region}</span>
          )}
          {event.league && !event.isNA && (
            <span className="text-xs text-text-muted">{event.league}</span>
          )}
        </div>
      </div>

      {/* Date + arrow */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {dateStr && (
          <span className="text-sm text-text-muted hidden sm:block">{dateStr}</span>
        )}
        <svg
          className="w-4 h-4 text-text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all duration-200"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );

  if (event.href) {
    return <Link href={event.href}>{inner}</Link>;
  }

  if (event.externalUrl) {
    return (
      <a href={event.externalUrl} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    );
  }

  return inner;
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

export default function EventList({ proEvents = [] }: { proEvents?: ProEvent[] }) {
  const [filter, setFilter] = useState<Filter>('all');

  // Combine all events into one list
  const allEvents: UnifiedEvent[] = [
    ...events.map(toUnified),
    ...proEvents.map(proToUnified),
  ];

  // Apply filter
  const filtered = filter === 'na' ? allEvents.filter((e) => e.isNA) : allEvents;

  // Group by status
  const live = filtered.filter((e) => e.status === 'ongoing');
  const upcoming = filtered.filter((e) => e.status === 'upcoming');
  const completed = filtered.filter((e) => e.status === 'completed');

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

      {/* Event Sections */}
      <div className="bg-surface rounded-xl border border-border p-6">
        {live.length === 0 && upcoming.length === 0 && completed.length === 0 ? (
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

            {/* Completed */}
            <SectionHeader
              title="Completed"
              count={completed.length}
              icon={
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-text-muted/20">
                  <span className="w-2 h-2 rounded-full bg-text-muted" />
                </span>
              }
            />
            {completed.length > 0 && (
              <div className="flex flex-col gap-2">
                {completed.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
