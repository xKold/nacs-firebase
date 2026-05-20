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
  const [expanded, setExpanded] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Autofocus the input when the bar expands
  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

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

  function collapse() {
    setOpen(false);
    setExpanded(false);
    setQuery('');
  }

  // Click outside to close
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        collapse();
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Esc to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') collapse();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < MIN_QUERY) return;
    collapse();
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
    <div ref={wrapperRef} className="relative flex items-center">
      <form
        onSubmit={onSubmit}
        className={`overflow-hidden transition-all duration-200 ease-out ${
          expanded ? 'w-44 sm:w-64 opacity-100 mr-2' : 'w-0 opacity-0 mr-0'
        }`}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search events, teams, players..."
          tabIndex={expanded ? 0 : -1}
          className="w-full bg-surface-hover border border-border rounded-md px-3 py-1.5 text-sm text-text placeholder-text-muted focus:outline-none focus:border-accent/60 transition-colors"
        />
      </form>

      <button
        type="button"
        aria-label={expanded ? 'Close search' : 'Open search'}
        onClick={() => {
          if (expanded) {
            collapse();
          } else {
            setExpanded(true);
            setOpen(true);
          }
        }}
        className="w-8 h-8 flex items-center justify-center rounded-md text-white/80 hover:text-white hover:bg-surface-hover transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </button>

      {showDropdown && expanded && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-surface border border-border rounded-lg shadow-xl shadow-black/40 overflow-hidden z-50">
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
              <Section title="Events" results={results.events} onPick={collapse} />
              <Section title="Teams" results={results.teams} onPick={collapse} />
              <Section title="Players" results={results.players} onPick={collapse} />

              {hasOverflow && (
                <Link
                  href={`/search?q=${encodeURIComponent(query.trim())}`}
                  onClick={collapse}
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
