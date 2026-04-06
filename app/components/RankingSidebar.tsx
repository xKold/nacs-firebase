'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface VRSTeam {
  rank: number;
  points: number;
  name: string;
  roster: string[];
}

// Known NA orgs for filtering
const NA_ORGS = new Set([
  'liquid', 'm80', 'nrg', 'wildcard', 'lag', 'boss', 'marsborne',
  'nouns', 'party astronauts', 'tak', 'famemas',
  'vagrants', 'exceritus', 'incontrol',
  'limited', 'timbermen', 'akimbo',
  'snap', 'straife', 'elevate', 'complexity',
  'voca', 'passion ua', 'made in usa',
]);

function isNA(name: string): boolean {
  return NA_ORGS.has(name.toLowerCase());
}

export default function RankingSidebar() {
  const [teams, setTeams] = useState<VRSTeam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/rankings')
      .then((res) => res.json())
      .then((data) => {
        // Filter to NA teams and unknown (likely NA)
        const naTeams = (data.teams || []).filter(
          (t: VRSTeam) => isNA(t.name),
        );
        setTeams(naTeams.slice(0, 20));
      })
      .catch(() => setTeams([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-bold text-text">NA Rankings</h3>
        <Link
          href="/rankings"
          className="text-[11px] font-semibold text-accent hover:underline uppercase tracking-wider"
        >
          View All
        </Link>
      </div>

      {loading ? (
        <div className="px-4 py-6 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : teams.length === 0 ? (
        <div className="px-4 py-6 text-text-muted text-xs text-center">No data</div>
      ) : (
        <div className="divide-y divide-border/50">
          {teams.map((t) => (
            <Link
              key={t.rank}
              href={`/teams/pro/${encodeURIComponent(t.name)}`}
              className="flex items-center gap-2 px-4 py-2 hover:bg-surface-hover/50 transition-colors"
            >
              <span
                className={`text-xs font-bold w-5 text-right ${
                  t.rank <= 3 ? 'text-yellow-400' : t.rank <= 10 ? 'text-accent' : 'text-text-muted'
                }`}
              >
                {t.rank}
              </span>
              <span className="text-xs font-semibold text-text hover:text-accent transition-colors truncate flex-1">
                {t.name}
              </span>
              <span className="text-[10px] font-mono text-text-muted">
                {t.points}
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="px-4 py-2 border-t border-border">
        <p className="text-[10px] text-text-muted text-center">
          Valve Regional Standings
        </p>
      </div>
    </div>
  );
}
