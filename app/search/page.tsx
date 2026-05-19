import Link from 'next/link';
import type { SearchResponse, SearchResult } from '@/lib/types/search';
import { headers } from 'next/headers';

async function fetchSearch(q: string): Promise<SearchResponse> {
  const h = await headers();
  const host = h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const base = host ? `${proto}://${host}` : '';
  try {
    const res = await fetch(`${base}/api/search?q=${encodeURIComponent(q)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return { events: [], teams: [], players: [] };
    return await res.json();
  } catch {
    return { events: [], teams: [], players: [] };
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';
  const results: SearchResponse =
    query.length >= 2
      ? await fetchSearch(query)
      : { events: [], teams: [], players: [] };

  const total =
    results.events.length + results.teams.length + results.players.length;

  return (
    <div className="max-w-5xl mx-auto px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          {query ? (
            <>
              Search results for{' '}
              <span className="text-accent">&ldquo;{query}&rdquo;</span>
            </>
          ) : (
            'Search'
          )}
        </h1>
        {query && (
          <p className="text-sm text-text-muted mt-1">
            {total} {total === 1 ? 'result' : 'results'} across events, teams, and players
          </p>
        )}
      </div>

      {!query && (
        <div className="bg-surface rounded-xl border border-border p-8 text-center text-text-muted">
          Type a query in the search bar to find events, teams, or players.
        </div>
      )}

      {query && total === 0 && (
        <div className="bg-surface rounded-xl border border-border p-8 text-center text-text-muted">
          No results for &ldquo;{query}&rdquo;.
        </div>
      )}

      {query && total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Column title="Events" results={results.events} />
          <Column title="Teams" results={results.teams} />
          <Column title="Players" results={results.players} />
        </div>
      )}
    </div>
  );
}

function Column({ title, results }: { title: string; results: SearchResult[] }) {
  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-surface-hover/40">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">{title}</h2>
          <span className="text-xs text-text-muted">{results.length}</span>
        </div>
      </div>
      {results.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-text-muted">
          No {title.toLowerCase()} found.
        </div>
      ) : (
        <div className="flex flex-col">
          {results.map((r) => (
            <Link
              key={`${r.source}-${r.id}`}
              href={r.href}
              className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover border-b border-border last:border-b-0 transition-colors"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {r.imageUrl ? (
                <img
                  src={r.imageUrl}
                  alt=""
                  className="w-9 h-9 rounded object-cover bg-surface-hover flex-shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded bg-surface-hover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium text-text">
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
                  <div className="text-xs text-text-muted truncate">
                    {r.subtitle}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
