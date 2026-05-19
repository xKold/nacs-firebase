'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { SearchResponse, SearchResult } from '@/lib/types/search';

const TOP_N = 3;
const DEBOUNCE_MS = 300;
const MIN_QUERY = 2;

const EMPTY: SearchResponse = { events: [], teams: [], players: [] };

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Debounced fetch
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }

    setLoading(true);
    const handle = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((res) => (res.ok ? res.json() : EMPTY))
        .then((data: SearchResponse) => setResults(data))
        .catch(() => setResults(EMPTY))
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Esc to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < MIN_QUERY) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  const totalResults =
    results.events.length + results.teams.length + results.players.length;
  const hasOverflow =
    results.events.length > TOP_N ||
    results.teams.length > TOP_N ||
    results.players.length > TOP_N;
  const showDropdown = open && query.trim().length >= MIN_QUERY;

  return (
    <div ref={wrapperRef} className="relative">
      <form onSubmit={onSubmit}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search events, teams, players..."
          className="w-44 sm:w-64 bg-surface/70 border border-border rounded-md px-3 py-1.5 text-sm text-text placeholder-text-muted focus:outline-none focus:border-accent/60 focus:bg-surface transition-colors"
        />
      </form>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface border border-border rounded-lg shadow-xl shadow-black/40 overflow-hidden z-50">
          {loading && totalResults === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-text-muted">
              Searching...
            </div>
          ) : totalResults === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-text-muted">
              No results for &ldquo;{query.trim()}&rdquo;
            </div>
          ) : (
            <>
              <Section title="Events" results={results.events} onPick={() => setOpen(false)} />
              <Section title="Teams" results={results.teams} onPick={() => setOpen(false)} />
              <Section title="Players" results={results.players} onPick={() => setOpen(false)} />

              {hasOverflow && (
                <Link
                  href={`/search?q=${encodeURIComponent(query.trim())}`}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2.5 text-center text-xs font-semibold text-accent hover:bg-surface-hover border-t border-border transition-colors"
                >
                  See all results →
                </Link>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  results,
  onPick,
}: {
  title: string;
  results: SearchResult[];
  onPick: () => void;
}) {
  if (results.length === 0) return null;
  const visible = results.slice(0, TOP_N);
  return (
    <div className="border-b border-border last:border-b-0">
      <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-text-muted font-semibold bg-surface-hover/40">
        {title}
      </div>
      {visible.map((r) => (
        <Link
          key={`${r.source}-${r.id}`}
          href={r.href}
          onClick={onPick}
          className="flex items-center gap-3 px-3 py-2 hover:bg-surface-hover transition-colors"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {r.imageUrl ? (
            <img
              src={r.imageUrl}
              alt=""
              className="w-7 h-7 rounded object-cover bg-surface-hover flex-shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded bg-surface-hover flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium text-text truncate">
              <span className="truncate">{r.name}</span>
              <span
                className={`text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${
                  r.source === 'faceit'
                    ? 'bg-orange-500/15 text-orange-400'
                    : 'bg-blue-500/15 text-blue-400'
                }`}
              >
                {r.source === 'faceit' ? 'FACEIT' : 'Pro'}
              </span>
            </div>
            {r.subtitle && (
              <div className="text-xs text-text-muted truncate">{r.subtitle}</div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
