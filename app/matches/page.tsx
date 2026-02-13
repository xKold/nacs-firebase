'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { getEventById, getEventByLeagueAndSeason, events } from '../../static/events';

interface Match {
  match_id: string;
  status: string;
  competition_id?: string;
  results?: {
    score?: {
      faction1?: number;
      faction2?: number;
    };
  };
  teams:
    | {
        faction1?: { name: string; faction_id?: string };
        faction2?: { name: string; faction_id?: string };
        nickname?: string;
      }
    | Array<{ nickname?: string; name?: string; faction_id?: string }>;
  scheduled_at?: number;
  started_at?: number;
  start_date?: string;
}

interface ProEvent {
  id: number;
  name: string;
  leagueName: string;
  leagueImageUrl: string | null;
  leagueId: number;
  beginAt: string | null;
  endAt: string | null;
  year: number | null;
  tier: string;
  status: 'upcoming' | 'ongoing' | 'completed';
}

function MatchesContent() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [proEvents, setProEvents] = useState<ProEvent[]>([]);
  const [proLoading, setProLoading] = useState(true);

  const searchParams = useSearchParams();
  const router = useRouter();
  const eventIdFromUrl = searchParams.get('event');

  useEffect(() => {
    if (eventIdFromUrl) {
      setSelectedEvent(eventIdFromUrl);
    } else {
      setSelectedEvent(events[0].id);
    }
  }, [eventIdFromUrl]);

  // Fetch pro events from PandaScore
  useEffect(() => {
    fetch('/api/pro-events')
      .then((res) => res.json())
      .then((data) => setProEvents(data.series || []))
      .catch(() => setProEvents([]))
      .finally(() => setProLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;

    let event = getEventById(selectedEvent);

    if (!event) {
      const leagueId = searchParams.get('leagueId');
      const seasonId = searchParams.get('seasonId');
      if (leagueId && seasonId) {
        event = getEventByLeagueAndSeason(leagueId, seasonId);
      }
    }

    if (!event) {
      setMatches([]);
      setLoading(false);
      return;
    }

    let url = '/api/matches?';

    if (event.type === 'championship') {
      url += `championshipId=${event.id}`;
    } else if (event.leagueId && event.seasonId) {
      url += `leagueId=${event.leagueId}&seasonId=${event.seasonId}`;
    } else {
      setMatches([]);
      setLoading(false);
      return;
    }

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setMatches(data.items || []);
      })
      .catch(() => setMatches([]))
      .finally(() => setLoading(false));
  }, [selectedEvent, searchParams]);

  const currentEvent = getEventById(selectedEvent);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-surface rounded-xl border border-border p-8">
          <div className="flex items-center gap-3 text-text-secondary">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            Loading matches...
          </div>
        </div>
      </div>
    );
  }

  // Categorize matches (case-insensitive status)
  const now = Date.now();
  const ongoing: Match[] = [];
  const upcoming: Match[] = [];
  const completed: Match[] = [];

  matches.forEach((match) => {
    const status = match.status?.toLowerCase();
    const start =
      typeof match.scheduled_at === 'number'
        ? match.scheduled_at * 1000
        : typeof match.started_at === 'number'
        ? match.started_at * 1000
        : NaN;

    if (status === 'ongoing') {
      ongoing.push(match);
    } else if (status === 'finished') {
      completed.push(match);
    } else if (!isNaN(start) && start <= now) {
      completed.push(match);
    } else {
      upcoming.push(match);
    }
  });

  const sortByStartTime = (a: Match, b: Match) => {
    const aStart = ((a.scheduled_at ?? a.started_at) ?? 0) * 1000;
    const bStart = ((b.scheduled_at ?? b.started_at) ?? 0) * 1000;
    return aStart - bStart;
  };
  ongoing.sort(sortByStartTime);
  upcoming.sort(sortByStartTime);
  completed.sort(sortByStartTime);

  const getTeamInfo = (match: Match) => {
    let faction1 = 'TBD';
    let faction2 = 'TBD';
    let team1Id: string | undefined;
    let team2Id: string | undefined;

    if (Array.isArray(match.teams)) {
      faction1 = match.teams[0]?.nickname || match.teams[0]?.name || 'TBD';
      faction2 = match.teams[1]?.nickname || match.teams[1]?.name || 'TBD';
      team1Id = match.teams[0]?.faction_id;
      team2Id = match.teams[1]?.faction_id;
    } else if (match.teams) {
      faction1 = match.teams.faction1?.name || 'TBD';
      faction2 = match.teams.faction2?.name || 'TBD';
      team1Id = match.teams.faction1?.faction_id;
      team2Id = match.teams.faction2?.faction_id;
    }

    return { faction1, faction2, team1Id, team2Id };
  };

  const renderTeamName = (name: string, teamId: string | undefined) => {
    if (teamId) {
      return (
        <Link
          href={`/teams/${teamId}?championship=${selectedEvent}`}
          onClick={(e) => e.stopPropagation()}
          className="font-semibold text-text hover:text-accent transition-colors"
        >
          {name}
        </Link>
      );
    }
    return <span className="font-semibold text-text">{name}</span>;
  };

  const renderMatch = (match: Match) => {
    const { faction1, faction2, team1Id, team2Id } = getTeamInfo(match);
    const status = match.status?.toLowerCase();
    const isLive = status === 'ongoing';
    const isFinished = status === 'finished';

    const rawTime = match.scheduled_at || match.started_at || 0;
    const time = rawTime
      ? new Date(rawTime * 1000).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      : 'TBD';

    const score1 = match.results?.score?.faction1;
    const score2 = match.results?.score?.faction2;
    const hasScore = score1 !== undefined && score2 !== undefined;

    return (
      <div
        key={match.match_id}
        onClick={() => router.push(`/matches/match/${match.match_id}`)}
        className="group flex items-center justify-between p-4 rounded-lg bg-surface-hover/50 border border-border hover:border-accent/40 hover:bg-surface-hover transition-all duration-200 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          {isLive && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-live">
              <span className="w-2 h-2 rounded-full bg-live animate-pulse" />
              LIVE
            </span>
          )}
          {renderTeamName(faction1, team1Id)}
          {hasScore ? (
            <span className="text-sm font-bold text-text-secondary">
              {score1} - {score2}
            </span>
          ) : (
            <span className="text-text-muted text-sm">vs</span>
          )}
          {renderTeamName(faction2, team2Id)}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-text-muted">{time}</span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
              isLive
                ? 'bg-live/10 text-live'
                : isFinished
                ? 'bg-success/10 text-success'
                : 'bg-warning/10 text-warning'
            }`}
          >
            {match.status}
          </span>
        </div>
      </div>
    );
  };

  const renderSection = (title: string, sectionMatches: Match[], badgeColor: string) => {
    if (sectionMatches.length === 0) return null;
    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className={`w-2 h-2 rounded-full ${badgeColor}`} />
          <h2 className="text-lg font-semibold">{title}</h2>
          <span className="text-xs text-text-muted">({sectionMatches.length})</span>
        </div>
        <div className="flex flex-col gap-2">
          {sectionMatches.map(renderMatch)}
        </div>
      </div>
    );
  };

  // Group pro events by status
  const proOngoing = proEvents.filter((e) => e.status === 'ongoing');
  const proUpcoming = proEvents.filter((e) => e.status === 'upcoming');
  const proCompleted = proEvents.filter((e) => e.status === 'completed');

  return (
    <div className="max-w-4xl mx-auto px-4 flex flex-col gap-6">
      {/* FACEIT Events */}
      <div className="bg-surface rounded-xl border border-border p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              {currentEvent?.name || 'Event'} Matches
            </h1>
            {currentEvent && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent mt-1 inline-block">
                {currentEvent.type === 'championship' ? 'Championship' : 'League'}
              </span>
            )}
          </div>
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="bg-surface-hover border border-border rounded-lg px-4 py-2 text-sm text-text focus:outline-none focus:border-accent transition-colors"
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </div>

        {ongoing.length === 0 && upcoming.length === 0 && completed.length === 0 && (
          <p className="text-text-muted text-center py-8">No matches found.</p>
        )}
        {renderSection('Ongoing', ongoing, 'bg-live')}
        {renderSection('Upcoming', upcoming, 'bg-warning')}
        {renderSection('Completed', completed, 'bg-success')}
      </div>

      {/* Pro Events (dynamically fetched from PandaScore) */}
      <div className="bg-surface rounded-xl border border-border p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Pro Events</h2>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 mt-1 inline-block">
              PandaScore
            </span>
          </div>
        </div>

        {proLoading ? (
          <div className="flex items-center gap-3 text-text-secondary py-4">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            Loading pro events...
          </div>
        ) : proEvents.length === 0 ? (
          <p className="text-text-muted text-center py-8">No pro events found.</p>
        ) : (
          <>
            {/* Ongoing */}
            {proOngoing.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-live" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">Live</h3>
                </div>
                <div className="flex flex-col gap-2">
                  {proOngoing.map((e) => (
                    <ProEventCard key={e.id} event={e} />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming */}
            {proUpcoming.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-warning" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">Upcoming</h3>
                </div>
                <div className="flex flex-col gap-2">
                  {proUpcoming.map((e) => (
                    <ProEventCard key={e.id} event={e} />
                  ))}
                </div>
              </div>
            )}

            {/* Completed */}
            {proCompleted.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">Completed</h3>
                </div>
                <div className="flex flex-col gap-2">
                  {proCompleted.map((e) => (
                    <ProEventCard key={e.id} event={e} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ProEventCard({ event }: { event: ProEvent }) {
  const dateRange = [
    event.beginAt
      ? new Date(event.beginAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : null,
    event.endAt
      ? new Date(event.endAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null,
  ]
    .filter(Boolean)
    .join(' \u2014 ');

  return (
    <Link
      href={`/matches/pro/serie/${event.id}`}
      className="group flex items-center justify-between p-4 rounded-lg bg-surface-hover/50 border border-border hover:border-accent/40 hover:bg-surface-hover transition-all duration-200"
    >
      <div className="flex items-center gap-3">
        {event.leagueImageUrl && (
          <img src={event.leagueImageUrl} alt="" className="w-6 h-6 object-contain flex-shrink-0" />
        )}
        <span className="font-semibold text-text group-hover:text-accent transition-colors">
          {event.leagueName}: {event.name}
        </span>
        {event.status === 'ongoing' && (
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-live">
            <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" />
            Live
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {dateRange && (
          <span className="text-xs text-text-muted hidden sm:inline" suppressHydrationWarning>
            {dateRange}
          </span>
        )}
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            event.status === 'ongoing'
              ? 'bg-live/10 text-live'
              : event.status === 'upcoming'
                ? 'bg-warning/10 text-warning'
                : 'bg-success/10 text-success'
          }`}
        >
          {event.status === 'ongoing' ? 'Live' : event.status === 'upcoming' ? 'Upcoming' : 'Completed'}
        </span>
      </div>
    </Link>
  );
}

export default function MatchesPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-surface rounded-xl border border-border p-8 text-text-secondary">
            Loading...
          </div>
        </div>
      }
    >
      <MatchesContent />
    </Suspense>
  );
}
