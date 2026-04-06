import Link from 'next/link';

// ─── Types ───────────────────────────────────────────────────────────

export interface PSTeam {
  id: number;
  name: string;
  acronym: string | null;
  location: string | null;
  image_url: string | null;
}

export interface PSGame {
  id: number;
  position: number;
  status: string;
  finished: boolean;
  length: number | null;
  winner: { id: number; type: string } | null;
}

export interface PSMatch {
  id: number;
  name: string;
  slug: string;
  status: 'not_started' | 'running' | 'finished' | 'canceled';
  match_type: string;
  number_of_games: number;
  scheduled_at: string | null;
  begin_at: string | null;
  end_at: string | null;
  forfeit: boolean;
  winner_id: number | null;
  winner: PSTeam | null;
  opponents?: { type: string; opponent: PSTeam }[];
  results: { score: number; team_id: number }[];
  games: PSGame[];
  streams_list: { main: boolean; language: string; raw_url: string | null }[];
}

export interface PSBracketMatch extends PSMatch {
  previous_matches: { type: 'winner' | 'loser'; match_id: number }[];
}

export interface PSTournament {
  id: number;
  name: string;
  tier: string;
  begin_at: string | null;
  end_at: string | null;
  has_bracket: boolean;
  matches: PSMatch[];
  teams: PSTeam[];
  league: { id: number; name: string; image_url: string | null };
  serie: { id: number; full_name: string | null; name: string | null; year: number | null };
}

// ─── Bracket Parsing ─────────────────────────────────────────────────

export interface BracketRound {
  label: string;
  matches: PSBracketMatch[];
}

export interface ParsedBracket {
  upperBracket: BracketRound[];
  lowerBracket: BracketRound[];
  grandFinal: PSBracketMatch | null;
}

export function parseBracket(bracketMatches: PSBracketMatch[]): ParsedBracket | null {
  if (!bracketMatches || bracketMatches.length === 0) return null;

  const matchMap = new Map<number, PSBracketMatch>();
  for (const m of bracketMatches) {
    matchMap.set(m.id, m);
  }

  const referencedIds = new Set<number>();
  for (const m of bracketMatches) {
    for (const prev of m.previous_matches || []) {
      referencedIds.add(prev.match_id);
    }
  }

  const depthCache = new Map<number, number>();
  function getDepth(matchId: number): number {
    if (depthCache.has(matchId)) return depthCache.get(matchId)!;
    const m = matchMap.get(matchId);
    if (!m || !m.previous_matches || m.previous_matches.length === 0) {
      depthCache.set(matchId, 0);
      return 0;
    }
    const maxPrevDepth = Math.max(
      ...m.previous_matches.map((p) => getDepth(p.match_id))
    );
    const depth = maxPrevDepth + 1;
    depthCache.set(matchId, depth);
    return depth;
  }

  for (const m of bracketMatches) {
    getDepth(m.id);
  }

  const hasLoserIncoming = new Set<number>();
  for (const m of bracketMatches) {
    for (const prev of m.previous_matches || []) {
      if (prev.type === 'loser') {
        hasLoserIncoming.add(m.id);
      }
    }
  }

  const isLBMatch = new Set<number>();
  function classifyLB(matchId: number): boolean {
    if (isLBMatch.has(matchId)) return true;
    const m = matchMap.get(matchId);
    if (!m) return false;

    if (hasLoserIncoming.has(matchId)) {
      isLBMatch.add(matchId);
      return true;
    }

    for (const prev of m.previous_matches || []) {
      if (prev.type === 'winner' && isLBMatch.has(prev.match_id)) {
        isLBMatch.add(matchId);
        return true;
      }
    }
    return false;
  }

  const sortedByDepth = [...bracketMatches].sort(
    (a, b) => (depthCache.get(a.id) || 0) - (depthCache.get(b.id) || 0)
  );

  for (const m of sortedByDepth) {
    if (hasLoserIncoming.has(m.id)) {
      isLBMatch.add(m.id);
    }
  }

  for (const m of sortedByDepth) {
    classifyLB(m.id);
  }

  let grandFinal: PSBracketMatch | null = null;
  const maxDepth = Math.max(...Array.from(depthCache.values()));

  for (const m of bracketMatches) {
    if ((depthCache.get(m.id) || 0) === maxDepth && m.previous_matches?.length >= 2) {
      const hasUBPrev = m.previous_matches.some((p) => !isLBMatch.has(p.match_id));
      const hasLBPrev = m.previous_matches.some((p) => isLBMatch.has(p.match_id));
      if (hasUBPrev && hasLBPrev) {
        grandFinal = m;
        break;
      }
    }
  }

  if (!grandFinal) {
    const maxDepthMatches = bracketMatches.filter(
      (m) => (depthCache.get(m.id) || 0) === maxDepth
    );
    if (maxDepthMatches.length === 1) {
      grandFinal = maxDepthMatches[0];
    }
  }

  const ubMatches: PSBracketMatch[] = [];
  const lbMatches: PSBracketMatch[] = [];

  for (const m of bracketMatches) {
    if (grandFinal && m.id === grandFinal.id) continue;
    if (isLBMatch.has(m.id)) {
      lbMatches.push(m);
    } else {
      ubMatches.push(m);
    }
  }

  function groupByRounds(matches: PSBracketMatch[]): Map<number, PSBracketMatch[]> {
    const rounds = new Map<number, PSBracketMatch[]>();
    for (const m of matches) {
      const d = depthCache.get(m.id) || 0;
      if (!rounds.has(d)) rounds.set(d, []);
      rounds.get(d)!.push(m);
    }
    return rounds;
  }

  function buildRounds(matches: PSBracketMatch[], isLower: boolean): BracketRound[] {
    const roundMap = groupByRounds(matches);
    const depths = [...roundMap.keys()].sort((a, b) => a - b);
    const totalRounds = depths.length;

    return depths.map((depth, idx) => {
      const roundMatches = roundMap.get(depth)!;
      let label: string;

      if (isLower) {
        if (idx === totalRounds - 1) label = 'LB Final';
        else label = `LB Round ${idx + 1}`;
      } else {
        if (totalRounds <= 1) {
          label = 'Final';
        } else if (idx === totalRounds - 1) {
          label = 'UB Final';
        } else if (idx === totalRounds - 2) {
          label = 'UB Semifinal';
        } else if (idx === totalRounds - 3 && roundMatches.length === 4) {
          label = 'UB Quarterfinal';
        } else {
          label = `UB Round ${idx + 1}`;
        }
      }

      return { label, matches: roundMatches };
    });
  }

  const upperBracket = buildRounds(ubMatches, false);
  const lowerBracket = buildRounds(lbMatches, true);

  if (lowerBracket.length === 0) {
    for (const round of upperBracket) {
      round.label = round.label.replace('UB ', '');
    }
  }

  return { upperBracket, lowerBracket, grandFinal };
}

// ─── Utilities ───────────────────────────────────────────────────────

export function getScore(match: PSMatch, teamId: number): number {
  return match.results.find((r) => r.team_id === teamId)?.score ?? 0;
}

export function TierBadge({ tier }: { tier: string }) {
  const t = tier.toUpperCase();
  const styles: Record<string, string> = {
    S: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    A: 'bg-accent/20 text-accent border-accent/40',
    B: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
    C: 'bg-text-muted/15 text-text-muted border-text-muted/30',
  };

  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
        styles[t] || styles.C
      }`}
    >
      {t}-Tier
    </span>
  );
}

// ─── Bracket Components ──────────────────────────────────────────────

export function BracketMatchCard({ match }: { match: PSBracketMatch }) {
  const isLive = match.status === 'running';
  const isFinished = match.status === 'finished' || match.status === 'canceled';
  const team1 = match.opponents?.[0]?.opponent;
  const team2 = match.opponents?.[1]?.opponent;
  const score1 = team1 ? getScore(match, team1.id) : 0;
  const score2 = team2 ? getScore(match, team2.id) : 0;
  const boLabel = match.number_of_games > 1 ? `BO${match.number_of_games}` : '';

  const timeStr = match.scheduled_at
    ? new Date(match.scheduled_at).toLocaleTimeString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

  const borderClass = isLive
    ? 'border-live/50 shadow-md shadow-live/10'
    : 'border-border hover:border-accent/40';

  return (
    <Link
      href={`/matches/pro/match/${match.id}`}
      className={`block w-[220px] rounded-lg border bg-surface transition-all duration-200 hover:bg-surface-hover overflow-hidden flex-shrink-0 ${borderClass}`}
    >
      {isLive && <div className="h-0.5 bg-live animate-pulse" />}

      <div className={`flex items-center gap-2 px-2.5 py-1.5 ${
        isFinished && match.winner_id === team1?.id ? '' : isFinished ? 'opacity-50' : ''
      }`}>
        {team1?.image_url ? (
          <img src={team1.image_url} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
        ) : (
          <div className="w-5 h-5 rounded bg-surface-hover flex-shrink-0" />
        )}
        <span className="text-sm font-semibold text-text truncate flex-1">
          {team1?.acronym || team1?.name || 'TBD'}
        </span>
        {isFinished || isLive ? (
          <span className={`text-sm font-bold flex-shrink-0 ${
            isFinished && match.winner_id === team1?.id ? 'text-success' : 'text-text-muted'
          }`}>
            {score1}
          </span>
        ) : null}
      </div>

      <div className="border-t border-border/50" />

      <div className={`flex items-center gap-2 px-2.5 py-1.5 ${
        isFinished && match.winner_id === team2?.id ? '' : isFinished ? 'opacity-50' : ''
      }`}>
        {team2?.image_url ? (
          <img src={team2.image_url} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
        ) : (
          <div className="w-5 h-5 rounded bg-surface-hover flex-shrink-0" />
        )}
        <span className="text-sm font-semibold text-text truncate flex-1">
          {team2?.acronym || team2?.name || 'TBD'}
        </span>
        {isFinished || isLive ? (
          <span className={`text-sm font-bold flex-shrink-0 ${
            isFinished && match.winner_id === team2?.id ? 'text-success' : 'text-text-muted'
          }`}>
            {score2}
          </span>
        ) : null}
      </div>

      <div className="border-t border-border/50 px-2.5 py-1 flex items-center justify-between">
        {isLive ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-live">
            <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" />
            Live
          </span>
        ) : !isFinished && timeStr ? (
          <span className="text-[10px] text-text-muted" suppressHydrationWarning>{timeStr}</span>
        ) : (
          <span />
        )}
        {boLabel && <span className="text-[10px] text-text-muted font-semibold">{boLabel}</span>}
        {match.forfeit && <span className="text-[10px] font-bold text-warning">FF</span>}
      </div>
    </Link>
  );
}

export function BracketConnectors({ topCount, bottomCount }: { topCount: number; bottomCount: number }) {
  const pairs = bottomCount;
  if (pairs <= 0) return null;

  return (
    <div className="flex flex-col justify-around flex-shrink-0 w-8" style={{ minHeight: topCount * 76 }}>
      {Array.from({ length: pairs }).map((_, i) => (
        <div key={i} className="flex flex-col flex-1">
          <div className="flex-1 border-r-2 border-b-2 border-border/40 rounded-br" />
          <div className="flex-1 border-r-2 border-t-2 border-border/40 rounded-tr" />
        </div>
      ))}
    </div>
  );
}

export function BracketSection({
  title,
  rounds,
}: {
  title: string;
  rounds: BracketRound[];
}) {
  if (rounds.length === 0) return null;

  return (
    <div className="mb-8">
      <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-3 px-1">
        {title}
      </h3>
      <div className="overflow-x-auto pb-4">
        <div className="flex items-stretch gap-0">
          {rounds.map((round, roundIdx) => (
            <div key={roundIdx} className="flex items-stretch">
              <div className="flex flex-col gap-3 flex-shrink-0">
                <div className="text-[11px] font-semibold text-text-muted text-center mb-1 uppercase tracking-wider">
                  {round.label}
                </div>
                <div className="flex flex-col justify-around flex-1 gap-3">
                  {round.matches.map((m) => (
                    <BracketMatchCard key={m.id} match={m} />
                  ))}
                </div>
              </div>
              {roundIdx < rounds.length - 1 && (
                <BracketConnectors
                  topCount={round.matches.length}
                  bottomCount={rounds[roundIdx + 1].matches.length}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Swiss Bracket ────────────────────────────────────────────────

/** Detect if bracket matches look like Swiss (no tree structure) */
export function isSwissFormat(matches: PSBracketMatch[]): boolean {
  if (matches.length === 0) return false;
  const noParent = matches.filter(
    (m) => !m.previous_matches || m.previous_matches.length === 0,
  ).length;
  // Swiss: virtually ALL matches have no previous_matches (flat, no tree)
  // Double-elim brackets have "round" in names too (e.g. "Lower bracket round 1")
  // so name-checking alone is not enough — require >80% orphan matches
  if (noParent / matches.length < 0.8) return false;
  // And match names should have simple "Round X:" pattern (not "bracket round")
  const swissNames = matches.filter((m) =>
    /^Round \d+/i.test((m.name || '').trim()),
  ).length;
  return swissNames > matches.length * 0.5;
}

interface SwissRound {
  label: string;
  matches: PSBracketMatch[];
}

/** Group Swiss matches into rounds — parse "Round X" from match names first, fall back to dates */
export function parseSwissRounds(matches: PSBracketMatch[]): SwissRound[] {
  // Try parsing round number from match name (e.g. "Round 3: Team A vs Team B")
  const byRoundNum = new Map<number, PSBracketMatch[]>();
  let nameParseCount = 0;

  for (const m of matches) {
    const rMatch = (m.name || '').match(/Round\s+(\d+)/i);
    if (rMatch) {
      const num = parseInt(rMatch[1]);
      if (!byRoundNum.has(num)) byRoundNum.set(num, []);
      byRoundNum.get(num)!.push(m);
      nameParseCount++;
    }
  }

  // If most matches have round numbers in name, use that grouping
  if (nameParseCount > matches.length * 0.5 && byRoundNum.size >= 2) {
    const nums = [...byRoundNum.keys()].sort((a, b) => a - b);
    return nums.map((num) => ({
      label: `Round ${num}`,
      matches: byRoundNum.get(num)!,
    }));
  }

  // Fallback: group by date
  const sorted = [...matches].sort((a, b) =>
    (a.scheduled_at || '').localeCompare(b.scheduled_at || ''),
  );
  const dayGroups = new Map<string, PSBracketMatch[]>();
  for (const m of sorted) {
    const day = m.scheduled_at
      ? new Date(m.scheduled_at).toISOString().slice(0, 10)
      : 'unknown';
    if (!dayGroups.has(day)) dayGroups.set(day, []);
    dayGroups.get(day)!.push(m);
  }
  const days = [...dayGroups.keys()].sort();
  if (days.length >= 2) {
    return days.map((day, idx) => ({
      label: `Round ${idx + 1}`,
      matches: dayGroups.get(day)!,
    }));
  }

  // Last fallback: equal-size chunks
  const teamIds = new Set<number>();
  for (const m of matches) {
    for (const opp of m.opponents || []) {
      if (opp.opponent?.id) teamIds.add(opp.opponent.id);
    }
  }
  const mpr = Math.max(1, Math.floor(teamIds.size / 2));
  const rounds: SwissRound[] = [];
  for (let i = 0; i < sorted.length; i += mpr) {
    rounds.push({ label: `Round ${rounds.length + 1}`, matches: sorted.slice(i, i + mpr) });
  }
  return rounds;
}

interface TeamRecord {
  id: number;
  name: string;
  acronym: string | null;
  imageUrl: string | null;
  wins: number;
  losses: number;
}

export function SwissBracketSection({ matches }: { matches: PSBracketMatch[] }) {
  const rounds = parseSwissRounds(matches);

  const records = new Map<number, TeamRecord>();
  function ensureTeam(t: PSTeam) {
    if (!records.has(t.id)) {
      records.set(t.id, { id: t.id, name: t.name, acronym: t.acronym, imageUrl: t.image_url, wins: 0, losses: 0 });
    }
  }

  // Build per-round W-L snapshots
  const roundSnapshots: Map<number, TeamRecord>[] = [];
  for (const round of rounds) {
    for (const m of round.matches) {
      const t1 = m.opponents?.[0]?.opponent;
      const t2 = m.opponents?.[1]?.opponent;
      if (t1) ensureTeam(t1);
      if (t2) ensureTeam(t2);
      if ((m.status === 'finished' || m.status === 'canceled') && m.winner_id) {
        const loserId = t1?.id === m.winner_id ? t2?.id : t1?.id;
        const wr = records.get(m.winner_id);
        if (wr) wr.wins++;
        if (loserId) { const lr = records.get(loserId); if (lr) lr.losses++; }
      }
    }
    const snap = new Map<number, TeamRecord>();
    for (const [id, r] of records) snap.set(id, { ...r });
    roundSnapshots.push(snap);
  }

  const finalStandings = [...records.values()].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.losses - b.losses;
  });

  // Determine advancement thresholds (typically 3-0 = advanced in 5-round Swiss)
  const maxRounds = rounds.length;
  const advanceWins = Math.ceil(maxRounds / 2) + (maxRounds % 2 === 0 ? 1 : 0);
  const eliminateLosses = advanceWins;

  return (
    <div className="mb-8">
      <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-3 px-1">
        Swiss Stage
      </h3>

      {/* HLTV-style round columns */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3">
          {rounds.map((round, rIdx) => {
            // Pre-round snapshot for W-L labels
            const preSnap = rIdx > 0 ? roundSnapshots[rIdx - 1] : null;
            // Group matches by W-L bucket for HLTV-style sub-headers
            const buckets = new Map<string, PSBracketMatch[]>();
            for (const m of round.matches) {
              const t1 = m.opponents?.[0]?.opponent;
              const rec = preSnap && t1 ? preSnap.get(t1.id) : null;
              const bucketKey = rec ? `${rec.wins}-${rec.losses}` : '0-0';
              if (!buckets.has(bucketKey)) buckets.set(bucketKey, []);
              buckets.get(bucketKey)!.push(m);
            }

            // Sort buckets: best record at top (most wins, fewest losses)
            const sortedBucketKeys = [...buckets.keys()].sort((a, b) => {
              const [aW, aL] = a.split('-').map(Number);
              const [bW, bL] = b.split('-').map(Number);
              if (bW !== aW) return bW - aW; // more wins first
              return aL - bL; // fewer losses first
            });

            return (
              <div key={rIdx} className="flex-shrink-0 w-[220px]">
                <div className="text-[11px] font-semibold text-text-muted text-center mb-2 uppercase tracking-wider">
                  {round.label}
                </div>
                <div className="flex flex-col gap-1.5">
                  {sortedBucketKeys.map((bucket) => {
                    const bMatches = buckets.get(bucket)!;
                    return (
                    <div key={bucket}>
                      {buckets.size > 1 && (
                        <div className="text-[10px] text-text-muted text-center mb-1 font-medium">
                          {bucket}
                        </div>
                      )}
                      {bMatches.map((m) => {
                        const t1 = m.opponents?.[0]?.opponent;
                        const t2 = m.opponents?.[1]?.opponent;
                        const s1 = t1 ? getScore(m, t1.id) : 0;
                        const s2 = t2 ? getScore(m, t2.id) : 0;
                        const isFinished = m.status === 'finished' || m.status === 'canceled';
                        const postSnap = roundSnapshots[rIdx];
                        const t1Post = postSnap && t1 ? postSnap.get(t1.id) : null;
                        const t2Post = postSnap && t2 ? postSnap.get(t2.id) : null;
                        const t1Advanced = t1Post && t1Post.wins >= advanceWins;
                        const t1Eliminated = t1Post && t1Post.losses >= eliminateLosses;
                        const t2Advanced = t2Post && t2Post.wins >= advanceWins;
                        const t2Eliminated = t2Post && t2Post.losses >= eliminateLosses;

                        const cardBorder = t1Advanced || t2Advanced
                          ? 'border-success/30'
                          : t1Eliminated || t2Eliminated
                            ? 'border-live/20'
                            : 'border-border';

                        return (
                          <Link
                            key={m.id}
                            href={`/matches/pro/match/${m.id}`}
                            className={`block rounded-lg border bg-surface hover:border-accent/40 transition-all overflow-hidden mb-1.5 ${cardBorder}`}
                          >
                            {/* Team 1 */}
                            <div className={`flex items-center gap-2 px-2.5 py-1.5 ${
                              isFinished && m.winner_id !== t1?.id ? 'opacity-40' : ''
                            } ${t1Advanced ? 'bg-success/5' : t1Eliminated ? 'bg-live/5' : ''}`}>
                              {t1?.image_url ? (
                                <img src={t1.image_url} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
                              ) : <div className="w-4 h-4 flex-shrink-0" />}
                              <span className="text-xs font-semibold text-text truncate flex-1">
                                {t1?.acronym || t1?.name || 'TBD'}
                              </span>
                              {isFinished && (
                                <span className={`text-xs font-bold min-w-[14px] text-right ${
                                  m.winner_id === t1?.id ? 'text-success' : 'text-text-muted'
                                }`}>{s1}</span>
                              )}
                            </div>
                            <div className="border-t border-border/30" />
                            {/* Team 2 */}
                            <div className={`flex items-center gap-2 px-2.5 py-1.5 ${
                              isFinished && m.winner_id !== t2?.id ? 'opacity-40' : ''
                            } ${t2Advanced ? 'bg-success/5' : t2Eliminated ? 'bg-live/5' : ''}`}>
                              {t2?.image_url ? (
                                <img src={t2.image_url} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
                              ) : <div className="w-4 h-4 flex-shrink-0" />}
                              <span className="text-xs font-semibold text-text truncate flex-1">
                                {t2?.acronym || t2?.name || 'TBD'}
                              </span>
                              {isFinished && (
                                <span className={`text-xs font-bold min-w-[14px] text-right ${
                                  m.winner_id === t2?.id ? 'text-success' : 'text-text-muted'
                                }`}>{s2}</span>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ); })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Final Standings */}
      {finalStandings.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2 px-1">
            Standings
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {finalStandings.map((t, idx) => {
              const isAdv = t.wins >= advanceWins;
              const isElim = t.losses >= eliminateLosses;
              return (
                <div
                  key={t.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    isAdv ? 'bg-success/10 border border-success/20'
                    : isElim ? 'bg-live/5 border border-live/10 opacity-50'
                    : 'bg-surface-hover/50 border border-border/50'
                  }`}
                >
                  <span className="text-text-muted font-mono text-xs w-4">{idx + 1}</span>
                  {t.imageUrl && <img src={t.imageUrl} alt="" className="w-4 h-4 object-contain" />}
                  <span className="font-semibold text-text truncate flex-1 text-xs">{t.acronym || t.name}</span>
                  <span className="text-[10px] font-bold text-success">{t.wins}</span>
                  <span className="text-[10px] text-text-muted">-</span>
                  <span className="text-[10px] font-bold text-live">{t.losses}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Prize Distribution ─────────────────────────────────────────────

export interface PSStanding {
  rank: number;
  team: PSTeam;
}

export function PrizeDistribution({
  prizePool,
}: {
  standings: PSStanding[];
  prizePool: string | null;
}) {
  const prizeAmount = prizePool ? parseInt(prizePool.replace(/[^0-9]/g, '')) || 0 : 0;
  if (prizeAmount <= 0) return null;

  return (
    <div className="mt-6 flex items-center gap-3 px-1">
      <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
        Prize Pool
      </h3>
      <span className="text-sm font-bold px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
        ${prizeAmount.toLocaleString()}
      </span>
    </div>
  );
}

// ─── List View Components ────────────────────────────────────────────

export function ListMatchCard({ match, teams }: { match: PSMatch; teams: Map<number, PSTeam> }) {
  const isLive = match.status === 'running';
  const isFinished = match.status === 'finished' || match.status === 'canceled';
  const team1 = match.opponents?.[0]?.opponent;
  const team2 = match.opponents?.[1]?.opponent;
  const score1 = team1 ? getScore(match, team1.id) : 0;
  const score2 = team2 ? getScore(match, team2.id) : 0;
  const winnerId = match.winner_id;
  const boLabel = match.number_of_games > 1 ? `BO${match.number_of_games}` : 'BO1';

  const liveStyles = isLive
    ? 'border-live/30 bg-gradient-to-r from-live/5 via-surface-hover/50 to-surface-hover/50 shadow-lg shadow-live/5'
    : 'border-border bg-surface-hover/50';

  const dateStr = match.scheduled_at
    ? new Date(match.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';

  const timeStr = match.scheduled_at
    ? new Date(match.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : '';

  const mainStream = match.streams_list?.find((s) => s.main && s.raw_url);

  if (!team1 && !team2) {
    return (
      <Link
        href={`/matches/pro/match/${match.id}`}
        className={`relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 hover:border-accent/40 ${liveStyles}`}
      >
        {isLive && (
          <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-live animate-pulse" />
        )}
        <div className="hidden sm:flex flex-col items-center gap-1 flex-shrink-0 w-20">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{boLabel}</span>
          {isLive && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-live">
              <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" />
              Live
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-text truncate">{match.name}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {isFinished && match.forfeit && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Forfeit</span>
          )}
          {dateStr && (
            <span className="text-sm text-text-muted hidden sm:block" suppressHydrationWarning>{dateStr}</span>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/matches/pro/match/${match.id}`}
      className={`relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 hover:border-accent/40 ${liveStyles}`}
    >
      {isLive && (
        <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-live animate-pulse" />
      )}

      <div className="hidden sm:flex flex-col items-center gap-1 flex-shrink-0 w-20">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{boLabel}</span>
        {isLive && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-live">
            <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" />
            Live
          </span>
        )}
        {!isLive && !isFinished && dateStr && (
          <span className="text-[11px] text-text-muted" suppressHydrationWarning>{dateStr}</span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
        <span className={`font-semibold truncate ${isFinished && winnerId === team1?.id ? 'text-text' : isFinished ? 'text-text-muted' : 'text-text'}`}>
          {team1?.acronym || team1?.name || 'TBD'}
        </span>
        {team1?.image_url && (
          <img src={team1.image_url} alt={team1.name} className="w-8 h-8 object-contain flex-shrink-0" />
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 px-2">
        {isFinished || isLive ? (
          <>
            <span className={`text-xl font-bold w-6 text-right ${isFinished && winnerId === team1?.id ? 'text-success' : isLive ? 'text-text' : 'text-text-muted'}`}>
              {score1}
            </span>
            <span className="text-text-muted text-sm">-</span>
            <span className={`text-xl font-bold w-6 text-left ${isFinished && winnerId === team2?.id ? 'text-success' : isLive ? 'text-text' : 'text-text-muted'}`}>
              {score2}
            </span>
          </>
        ) : (
          <span className="text-sm text-text-muted font-medium px-2" suppressHydrationWarning>{timeStr || 'TBD'}</span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-1 min-w-0">
        {team2?.image_url && (
          <img src={team2.image_url} alt={team2.name} className="w-8 h-8 object-contain flex-shrink-0" />
        )}
        <span className={`font-semibold truncate ${isFinished && winnerId === team2?.id ? 'text-text' : isFinished ? 'text-text-muted' : 'text-text'}`}>
          {team2?.acronym || team2?.name || 'TBD'}
        </span>
      </div>

      <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
        {match.forfeit && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">FF</span>
        )}
        {isLive && mainStream?.raw_url && (
          <span className="text-[11px] font-semibold uppercase tracking-wider text-live">
            Watch
          </span>
        )}
      </div>
    </Link>
  );
}

export function MatchListSectionHeader({
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
      <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">{title}</h2>
      <span className="text-xs text-text-muted bg-surface-hover px-2 py-0.5 rounded-full">{count}</span>
    </div>
  );
}
