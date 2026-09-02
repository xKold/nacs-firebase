import type { Metadata } from 'next';
import { headers } from 'next/headers';
import EventList from './components/EventList';
import RankingSidebar from './components/RankingSidebar';
import type { UnifiedEventDTO } from '@/lib/types/events';

export const metadata: Metadata = {
  title: 'NACS | North American CS2 Esports',
  description:
    'Live tournament tracking, brackets, standings, and rankings for North American Counter-Strike 2. ESEA, Fragadelphia, CCT, BLAST, and more.',
  openGraph: {
    title: 'NACS | North American CS2 Esports',
    description:
      'Live tournament tracking, brackets, standings, and rankings for North American Counter-Strike 2.',
    url: 'https://nacs2x.vercel.app',
    siteName: 'NACS',
    type: 'website',
  },
};

// Revalidate every 60s so live/upcoming events stay fresh without rebuilding on every request.
export const revalidate = 60;

async function fetchEvents(): Promise<UnifiedEventDTO[]> {
  const h = await headers();
  const host = h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const base = host ? `${proto}://${host}` : 'https://nacs2x.vercel.app';
  try {
    const res = await fetch(`${base}/api/events`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.events ?? []) as UnifiedEventDTO[];
  } catch {
    return [];
  }
}

export default async function Home() {
  const events = await fetchEvents();

  return (
    <div className="relative max-w-5xl mx-auto px-4">
      {/* Rankings sidebar — positioned to the left of the main content, doesn't affect layout */}
      <div className="hidden xl:block absolute right-full mr-4 top-0 w-[200px]">
        <div className="sticky top-20">
          <RankingSidebar />
        </div>
      </div>

      {/* Main content — events are server-rendered so search engines see real content */}
      <EventList events={events} loading={false} />
    </div>
  );
}
