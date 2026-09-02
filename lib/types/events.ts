export type EventSource = 'faceit' | 'pandascore';
export type EventStatus = 'live' | 'upcoming' | 'completed';

/** What the API returns — no status field, client computes it from dates */
export interface UnifiedEventDTO {
  id: string;
  name: string;
  source: EventSource;
  beginAt: string | null;
  endAt: string | null;
  href: string;
  leagueName?: string;
  leagueImageUrl?: string | null;
  tier?: string;
  isNA: boolean;
  region?: string;
  tournamentCount?: number;
  /** When true, `href` is an absolute URL to an external site (e.g., FACEIT.com) — render as <a target="_blank"> */
  external?: boolean;
}

/** Client-enriched event with computed status */
export interface UnifiedEvent extends UnifiedEventDTO {
  status: EventStatus;
}

/** Compute live/upcoming/completed from timestamps — runs client-side on every render */
export function computeStatus(
  beginAt: string | null,
  endAt: string | null,
): EventStatus {
  const now = Date.now();
  const begin = beginAt ? new Date(beginAt).getTime() : null;
  const end = endAt ? new Date(endAt).getTime() : null;
  if (begin && now < begin) return 'upcoming';
  if (end && now > end) return 'completed';
  if (begin) return 'live';
  return 'completed';
}
