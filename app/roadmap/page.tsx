import SuggestionsCard from '@/app/components/SuggestionsCard';

const ROADMAP: { title: string; bullets: string[] }[] = [
  {
    title: 'Match Page Enhancements',
    bullets: [
      'BO1 display: hide "Overall" tab when only 1 map',
      'Round-by-round timeline if API supports it',
    ],
  },
  {
    title: 'Standings Visual Improvement',
    bullets: [
      'Team logos, alternating row backgrounds, better spacing',
      'Games played column, win percentage, form indicator (last 5 results)',
      'Group labels if championship has groups',
    ],
  },
  {
    title: 'Player Page Overhaul (HLTV-style)',
    bullets: [
      'Rating, impact, opening kills, clutch stats',
      'Per-map breakdown, performance trends, head-to-head records',
    ],
  },
  {
    title: 'Auto-Fetch ESEA Events',
    bullets: [
      'ESEA Organizer ID: 08b06cfc-74d0-454b-9a51-feda4b6b18da',
      'Replace hardcoded static/events.ts with dynamic fetching',
    ],
  },
];

export default function RoadmapPage() {
  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roadmap */}
        <div className="lg:col-span-2">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">NACS Roadmap</h1>
            <p className="text-text-muted text-sm mt-2">
              What&rsquo;s coming next, in priority order.
            </p>
          </div>

          <div className="relative">
            {/* Vertical connecting line — sits behind the numbered badges */}
            <div
              className="absolute left-5 top-5 bottom-5 w-px bg-border"
              aria-hidden
            />

            {ROADMAP.map((item, idx) => (
              <div key={idx} className="relative pl-16 pb-6 last:pb-0">
                {/* Number badge */}
                <div className="absolute left-0 top-0 w-11 h-11 rounded-full bg-accent text-white text-base font-bold flex items-center justify-center shadow-lg shadow-accent/30 ring-4 ring-bg">
                  {idx + 1}
                </div>

                {/* Priority card */}
                <div className="bg-surface rounded-xl border border-border p-5 hover:border-accent/40 transition-colors">
                  <h2 className="text-lg font-semibold text-text">
                    {item.title}
                  </h2>
                  <ul className="mt-3 space-y-2">
                    {item.bullets.map((b, i) => (
                      <li
                        key={i}
                        className="text-sm text-text-secondary leading-relaxed flex gap-2"
                      >
                        <span className="text-accent flex-shrink-0 mt-0.5">
                          ▸
                        </span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Suggestions sidebar */}
        <aside className="lg:col-span-1">
          <SuggestionsCard />
        </aside>
      </div>
    </div>
  );
}
