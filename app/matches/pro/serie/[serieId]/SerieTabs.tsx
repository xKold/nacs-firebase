'use client';

import { useState } from 'react';
import {
  PSTeam,
  PSMatch,
  PSBracketMatch,
  PSTournament,
  ParsedBracket,
  BracketSection,
  BracketMatchCard,
  ListMatchCard,
  MatchListSectionHeader,
} from '../../components/bracket';

export interface StageData {
  tournament: PSTournament;
  matches: PSMatch[];
  bracket: ParsedBracket | null;
}

export default function SerieTabs({ stages }: { stages: StageData[] }) {
  // Auto-select stage with live matches, or first stage
  const defaultIdx = stages.findIndex((s) =>
    s.matches.some((m) => m.status === 'running')
  );
  const [activeIdx, setActiveIdx] = useState(defaultIdx >= 0 ? defaultIdx : 0);

  const stage = stages[activeIdx];
  if (!stage) return null;

  const { tournament, matches, bracket } = stage;
  const hasBracket =
    bracket &&
    (bracket.upperBracket.length > 0 ||
      bracket.lowerBracket.length > 0 ||
      bracket.grandFinal);

  const teamsMap = new Map<number, PSTeam>();
  for (const team of tournament.teams || []) {
    teamsMap.set(team.id, team);
  }

  const live = matches.filter((m) => m.status === 'running');
  const upcoming = matches.filter((m) => m.status === 'not_started');
  const finished = matches.filter(
    (m) => m.status === 'finished' || m.status === 'canceled'
  );

  return (
    <div>
      {/* Pill tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {stages.map((s, idx) => {
          const hasLive = s.matches.some((m) => m.status === 'running');
          return (
            <button
              key={s.tournament.id}
              onClick={() => setActiveIdx(idx)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeIdx === idx
                  ? 'bg-accent text-white shadow-lg shadow-accent/25'
                  : 'bg-surface-hover border border-border text-text-secondary hover:text-text hover:border-accent/40'
              }`}
            >
              {s.tournament.name}
              {hasLive && (
                <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-live">
                  <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" />
                  Live
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Stage content */}
      <div className="bg-surface rounded-xl border border-border p-6">
        {hasBracket ? (
          <>
            {bracket.upperBracket.length > 0 && (
              <BracketSection
                title={
                  bracket.lowerBracket.length > 0 ? 'Upper Bracket' : 'Bracket'
                }
                rounds={bracket.upperBracket}
              />
            )}

            {bracket.lowerBracket.length > 0 && (
              <BracketSection title="Lower Bracket" rounds={bracket.lowerBracket} />
            )}

            {bracket.grandFinal && (
              <div className="mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-3 px-1">
                  Grand Final
                </h3>
                <BracketMatchCard match={bracket.grandFinal} />
              </div>
            )}
          </>
        ) : matches.length === 0 ? (
          <p className="text-text-muted text-center py-8">
            No matches scheduled yet.
          </p>
        ) : (
          <>
            <MatchListSectionHeader
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
                {live.map((m) => (
                  <ListMatchCard key={m.id} match={m} teams={teamsMap} />
                ))}
              </div>
            )}

            <MatchListSectionHeader
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
                {upcoming.map((m) => (
                  <ListMatchCard key={m.id} match={m} teams={teamsMap} />
                ))}
              </div>
            )}

            <MatchListSectionHeader
              title="Completed"
              count={finished.length}
              icon={
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-text-muted/20">
                  <span className="w-2 h-2 rounded-full bg-text-muted" />
                </span>
              }
            />
            {finished.length > 0 && (
              <div className="flex flex-col gap-2">
                {finished.map((m) => (
                  <ListMatchCard key={m.id} match={m} teams={teamsMap} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
