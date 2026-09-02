'use client';

import Link from 'next/link';

interface BracketFaction {
  number: number;
  entity?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface BracketMatch {
  number: number;
  id: string;
  originId?: string;
  status: string; // 'created' | 'dummy' | 'finished' | 'ongoing' | etc.
  schedule?: number; // ms epoch
  bestOf?: number;
  factions: BracketFaction[];
}

interface BracketGroup {
  type: string; // 'simpleBracket' | 'lowerBracket' | 'singleFinalBracket'
  rounds: { number: number; matches: string[] }[];
  matches: Record<string, BracketMatch>;
}

export interface BracketData {
  upper?: BracketGroup;
  lower?: BracketGroup;
  grandFinal?: BracketGroup;
}

export interface MatchScoreMap {
  [matchId: string]: {
    status?: string;
    faction1Score?: number;
    faction2Score?: number;
  };
}

// ── Layout constants ──────────────────────────────────────────────────

const CARD_WIDTH = 200; // px
const CARD_HEIGHT = 62; // px
const ROW_HEIGHT = 44; // px per grid row (R1 matches span 2 rows)
const COL_GAP = 44; // px between rounds (space for connectors)

// ── Helpers ────────────────────────────────────────────────────────────

function roundLabel(
  sectionType: 'upper' | 'lower' | 'grandFinal',
  totalRounds: number,
  roundNumber: number,
): string {
  if (sectionType === 'grandFinal') return 'Grand Final';
  if (sectionType === 'upper') {
    const roundsFromEnd = totalRounds - roundNumber;
    if (roundsFromEnd === 0) return 'Upper Final';
    if (roundsFromEnd === 1) return 'Upper Semis';
    return `Upper R${roundNumber}`;
  }
  const roundsFromEnd = totalRounds - roundNumber;
  if (roundsFromEnd === 0) return 'Lower Final';
  if (roundsFromEnd === 1) return 'Lower Semis';
  return `Lower R${roundNumber}`;
}

// ── Match card ─────────────────────────────────────────────────────────

function MatchCard({
  match,
  scoreMap,
}: {
  match: BracketMatch;
  scoreMap: MatchScoreMap;
}) {
  const f1 = match.factions[0]?.entity;
  const f2 = match.factions[1]?.entity;
  const isDummy = match.status === 'dummy' || (!f1 && !f2);

  const scoreRec = match.originId ? scoreMap[match.originId] : undefined;
  const s1 = scoreRec?.faction1Score;
  const s2 = scoreRec?.faction2Score;
  const hasScore = typeof s1 === 'number' && typeof s2 === 'number';
  const status = scoreRec?.status?.toUpperCase() || match.status?.toUpperCase();
  const isFinished = status === 'FINISHED';
  const isLive = status === 'ONGOING';

  const f1Won = hasScore && s1! > s2!;
  const f2Won = hasScore && s2! > s1!;

  const cardBorderClass = isDummy
    ? 'border-border/40 bg-surface-hover/20'
    : isLive
      ? 'border-live/60 bg-gradient-to-r from-live/5 to-surface-hover/60 shadow-md shadow-live/10'
      : 'border-border bg-surface-hover/60 hover:border-accent/50 hover:bg-surface-hover';

  const teamRow = (name: string | undefined, score: number | undefined, won: boolean) => (
    <div
      className={`flex items-center justify-between h-[26px] px-2.5 text-[13px] leading-none ${
        won ? 'text-text font-bold' : 'text-text-secondary'
      }`}
    >
      <span className="truncate flex-1">{name || 'TBD'}</span>
      {typeof score === 'number' && (
        <span className={`ml-2 font-mono text-[13px] ${won ? 'text-success' : 'text-text-muted'}`}>
          {score}
        </span>
      )}
    </div>
  );

  const inner = (
    <div
      className={`rounded-md border transition-all duration-200 overflow-hidden ${cardBorderClass}`}
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
    >
      {teamRow(f1?.name, s1, f1Won)}
      <div className="border-t border-border/40" />
      {teamRow(f2?.name, s2, f2Won)}
      {isLive && (
        <div className="absolute -mt-[62px] ml-1 flex items-center gap-1 text-[9px] uppercase tracking-wider font-semibold text-live">
          <span className="w-1 h-1 rounded-full bg-live animate-pulse" />
          Live
        </div>
      )}
    </div>
  );

  if (match.originId && !isDummy) {
    return (
      <Link href={`/matches/match/${match.originId}`} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}

// ── Connector SVG between two rounds ───────────────────────────────────

function Connector({
  fromCount,
  toCount,
  totalRows,
  isEliminationBracket, // upper OR uniform-double lower: pairs feed 1 next match
}: {
  fromCount: number;
  toCount: number;
  totalRows: number;
  isEliminationBracket: boolean;
}) {
  if (fromCount === 0 || toCount === 0) return null;

  const totalHeight = totalRows * ROW_HEIGHT;
  const width = COL_GAP;

  // Y position of a match's center in a given round column
  const centerY = (matchIndex: number, matchesInRound: number) => {
    const rowSpan = totalRows / matchesInRound;
    return matchIndex * rowSpan * ROW_HEIGHT + (rowSpan * ROW_HEIGHT) / 2;
  };

  const paths: string[] = [];
  const midX = width / 2;

  if (isEliminationBracket && toCount === fromCount / 2) {
    // Standard bracket connector: pair (2i, 2i+1) → i
    for (let i = 0; i < toCount; i++) {
      const y1 = centerY(2 * i, fromCount);
      const y2 = centerY(2 * i + 1, fromCount);
      const yNext = centerY(i, toCount);
      // Two paths: from y1 → midX → yNext, and from y2 → midX → yNext
      paths.push(`M 0 ${y1} L ${midX} ${y1} L ${midX} ${yNext} L ${width} ${yNext}`);
      paths.push(`M 0 ${y2} L ${midX} ${y2} L ${midX} ${yNext}`);
    }
  } else if (fromCount === toCount) {
    // Same count: straight lines
    for (let i = 0; i < fromCount; i++) {
      const y = centerY(i, fromCount);
      paths.push(`M 0 ${y} L ${width} ${y}`);
    }
  } else {
    // Fallback: straight from each to nearest
    for (let i = 0; i < fromCount; i++) {
      const yFrom = centerY(i, fromCount);
      const yTo = centerY(Math.floor((i * toCount) / fromCount), toCount);
      paths.push(`M 0 ${yFrom} L ${midX} ${yFrom} L ${midX} ${yTo} L ${width} ${yTo}`);
    }
  }

  return (
    <svg
      width={width}
      height={totalHeight}
      style={{ flexShrink: 0 }}
      className="text-border"
    >
      {paths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth={1.5} />
      ))}
    </svg>
  );
}

// ── Bracket section (upper or lower) ───────────────────────────────────

function BracketSection({
  title,
  group,
  sectionType,
  scoreMap,
}: {
  title: string;
  group: BracketGroup;
  sectionType: 'upper' | 'lower' | 'grandFinal';
  scoreMap: MatchScoreMap;
}) {
  if (!group?.rounds?.length) return null;

  // For proper pyramid alignment, base total rows on the largest round.
  const maxMatches = Math.max(...group.rounds.map((r) => r.matches.length));
  // Each match takes a minimum of 2 rows; the largest round fills the column exactly.
  const totalRows = maxMatches * 2;
  const totalHeight = totalRows * ROW_HEIGHT;
  const totalRounds = group.rounds.length;

  return (
    <div className="mb-10 last:mb-0">
      <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-4">
        {title}
      </h3>
      <div className="overflow-x-auto pb-3">
        <div className="flex items-start" style={{ minHeight: totalHeight + 32 }}>
          {group.rounds.map((round, rIdx) => {
            const matchesInRound = round.matches.length;
            const rowSpan = totalRows / matchesInRound;
            const nextRound = group.rounds[rIdx + 1];
            const nextCount = nextRound?.matches.length ?? 0;
            const isElim = nextCount === matchesInRound / 2;

            return (
              <div key={round.number} className="flex items-start">
                {/* Round column */}
                <div className="flex flex-col" style={{ width: CARD_WIDTH }}>
                  <div className="text-center text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2 h-6">
                    {roundLabel(sectionType, totalRounds, round.number)}
                  </div>
                  <div
                    className="grid gap-0"
                    style={{
                      gridTemplateRows: `repeat(${totalRows}, ${ROW_HEIGHT}px)`,
                    }}
                  >
                    {round.matches.map((mid) => {
                      const match = group.matches[mid];
                      if (!match) return null;
                      return (
                        <div
                          key={mid}
                          className="flex items-center justify-center"
                          style={{ gridRow: `span ${rowSpan}` }}
                        >
                          <MatchCard match={match} scoreMap={scoreMap} />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Connector to next round */}
                {rIdx < group.rounds.length - 1 && (
                  <div className="pt-8">
                    <Connector
                      fromCount={matchesInRound}
                      toCount={nextCount}
                      totalRows={totalRows}
                      isEliminationBracket={isElim}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Grand Final (single match, centered) ───────────────────────────────

function GrandFinalSection({
  group,
  scoreMap,
}: {
  group: BracketGroup;
  scoreMap: MatchScoreMap;
}) {
  const round = group.rounds[0];
  if (!round) return null;
  return (
    <div className="mb-2">
      <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-4">
        Grand Final
      </h3>
      <div className="flex justify-center">
        {round.matches.map((mid) => {
          const match = group.matches[mid];
          if (!match) return null;
          return <MatchCard key={mid} match={match} scoreMap={scoreMap} />;
        })}
      </div>
    </div>
  );
}

// ── Root export ────────────────────────────────────────────────────────

export default function EventBracket({
  bracket,
  scoreMap,
}: {
  bracket: BracketData;
  scoreMap: MatchScoreMap;
}) {
  const hasAnything =
    (bracket.upper?.rounds?.length ?? 0) > 0 ||
    (bracket.lower?.rounds?.length ?? 0) > 0 ||
    (bracket.grandFinal?.rounds?.length ?? 0) > 0;
  if (!hasAnything) return null;

  return (
    <div className="mt-6 bg-surface rounded-xl border border-border p-6">
      <h2 className="text-lg font-semibold mb-4">Bracket</h2>
      {bracket.upper && (
        <BracketSection
          title="Upper Bracket"
          group={bracket.upper}
          sectionType="upper"
          scoreMap={scoreMap}
        />
      )}
      {bracket.lower && (
        <BracketSection
          title="Lower Bracket"
          group={bracket.lower}
          sectionType="lower"
          scoreMap={scoreMap}
        />
      )}
      {bracket.grandFinal && (
        <GrandFinalSection group={bracket.grandFinal} scoreMap={scoreMap} />
      )}
    </div>
  );
}
