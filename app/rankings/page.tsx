'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface VRSTeam {
  rank: number;
  points: number;
  name: string;
  roster: string[];
}

type ApiRegion = 'americas' | 'europe' | 'asia' | 'global';
type DisplayRegion = 'na' | 'sa' | 'americas' | 'europe' | 'asia' | 'global';

const REGIONS: { key: DisplayRegion; label: string }[] = [
  { key: 'na', label: 'NA' },
  { key: 'sa', label: 'SA' },
  { key: 'americas', label: 'Americas' },
  { key: 'europe', label: 'Europe' },
  { key: 'asia', label: 'Asia' },
  { key: 'global', label: 'Global' },
];

// Known SA orgs for filtering Americas into NA/SA
const SA_ORGS = new Set([
  'furia', '9z', 'pain', 'legacy', 'sharks', 'gaimin gladiators',
  'mibr', 'bestia', 'oddik', 'fluxo', 'shinden', 'red canids',
  'imperial', 'bounty hunters', 'galorys', 'lp', 'fake do biru',
  'keyd stars', 'isurus', 'gamehunters', 'uno mille', 'flyquest',
  'dusty roots', 'intense', 'swingers', 'adalyamigos',
  'sensei', 'solid', 'nitro', 'w7m', 'case', 'paqueta',
  'kru', 'leviatan', 'infinity', 'hawks',
]);

function isSA(name: string): boolean {
  return SA_ORGS.has(name.toLowerCase());
}

export default function RankingsPage() {
  const [teams, setTeams] = useState<VRSTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [region, setRegion] = useState<DisplayRegion>('na');

  // NA and SA both fetch from 'americas' API
  const apiRegion: ApiRegion = (region === 'na' || region === 'sa') ? 'americas' : region;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/rankings?region=${apiRegion}`)
      .then((res) => res.json())
      .then((data) => {
        let result = data.teams || [];
        // Filter NA/SA from Americas data
        if (region === 'na') {
          result = result.filter((t: VRSTeam) => !isSA(t.name));
        } else if (region === 'sa') {
          result = result.filter((t: VRSTeam) => isSA(t.name));
        }
        setTeams(result);
        setUpdatedAt(data.updatedAt);
      })
      .catch(() => setTeams([]))
      .finally(() => setLoading(false));
  }, [region, apiRegion]);

  return (
    <div className="max-w-5xl mx-auto px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Valve Regional Standings</h1>
          <p className="text-text-secondary text-sm mt-1">
            {updatedAt && (
              <span className="text-text-muted">
                Updated{' '}
                {new Date(updatedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            )}
          </p>
        </div>

        {/* Region tabs */}
        <div className="flex items-center bg-surface rounded-lg border border-border p-0.5">
          {REGIONS.map((r) => (
            <button
              key={r.key}
              onClick={() => setRegion(r.key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                region === r.key
                  ? 'bg-accent text-white shadow-lg shadow-accent/25'
                  : 'text-text-secondary hover:text-text'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rankings Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-12 text-text-secondary">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            Loading rankings...
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-hover/50">
                <th className="text-left px-4 py-3 text-text-muted font-semibold w-12">#</th>
                <th className="text-left px-4 py-3 text-text-muted font-semibold">Team</th>
                <th className="text-right px-4 py-3 text-text-muted font-semibold w-20">Points</th>
                <th className="text-left px-4 py-3 text-text-muted font-semibold hidden md:table-cell">Roster</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <tr
                  key={t.rank}
                  className="border-b border-border/50 hover:bg-surface-hover/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span
                      className={`font-bold ${
                        t.rank <= 3
                          ? 'text-yellow-400'
                          : t.rank <= 10
                            ? 'text-accent'
                            : 'text-text-muted'
                      }`}
                    >
                      {t.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/teams/pro/${encodeURIComponent(t.name)}`}
                      className="font-semibold text-text hover:text-accent transition-colors"
                    >
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono font-bold text-text">
                      {t.points.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-muted text-xs hidden md:table-cell">
                    {t.roster.join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && teams.length === 0 && (
          <div className="text-text-muted text-center py-8">No teams found.</div>
        )}
      </div>

      <p className="text-text-muted text-xs mt-4 text-center">
        Data from{' '}
        <a
          href="https://github.com/ValveSoftware/counter-strike_regional_standings"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          Valve Counter-Strike Regional Standings
        </a>
      </p>
    </div>
  );
}
