import { redirect } from 'next/navigation';
import Link from 'next/link';

interface FaceitPlayer {
  player_id: string;
  nickname: string;
  country?: string;
  games?: { cs2?: { skill_level?: number; faceit_elo?: number } };
  avatar?: string;
}

export default async function PlayerLookupPage({
  searchParams,
}: {
  searchParams: Promise<{ nick?: string }>;
}) {
  const { nick } = await searchParams;
  if (!nick) redirect('/');

  const headers = {
    Authorization: `Bearer ${process.env.FACEIT_API_KEY}`,
    Accept: 'application/json',
  };

  const url = `https://open.faceit.com/data/v4/search/players?nickname=${encodeURIComponent(nick)}&game=cs2&limit=10`;

  let items: FaceitPlayer[] = [];
  try {
    const res = await fetch(url, { headers, next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      items = (data.items ?? []) as FaceitPlayer[];
    }
  } catch {
    // fall through to not-found state
  }

  const exact = items.find(
    (p) => p.nickname?.toLowerCase() === nick.toLowerCase(),
  );
  if (exact) {
    redirect(`/players/${exact.player_id}?view=pro`);
  }

  return (
    <div className="max-w-2xl mx-auto px-4">
      <div className="bg-surface rounded-xl border border-border p-8">
        <h1 className="text-xl font-bold mb-2">No exact match for &ldquo;{nick}&rdquo;</h1>
        {items.length > 0 ? (
          <>
            <p className="text-text-secondary text-sm mb-4">
              Did you mean one of these?
            </p>
            <div className="flex flex-col gap-2">
              {items.slice(0, 10).map((p) => (
                <Link
                  key={p.player_id}
                  href={`/players/${p.player_id}?view=pro`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-surface-hover/50 border border-border hover:border-accent/40 transition-all"
                >
                  <span className="font-semibold">{p.nickname}</span>
                  {p.country && (
                    <span className="text-xs text-text-muted">
                      {p.country.toUpperCase()}
                    </span>
                  )}
                  {p.games?.cs2?.faceit_elo && (
                    <span className="text-xs text-text-muted ml-auto">
                      ELO {p.games.cs2.faceit_elo}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </>
        ) : (
          <p className="text-text-muted">
            No FACEIT profile found matching that nickname.
          </p>
        )}
      </div>
    </div>
  );
}
