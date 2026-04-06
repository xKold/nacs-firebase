'use client';

import { useEffect, useState } from 'react';
import EventList from './components/EventList';
import RankingSidebar from './components/RankingSidebar';
import type { UnifiedEventDTO } from '@/lib/types/events';

export default function Home() {
  const [events, setEvents] = useState<UnifiedEventDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/events')
      .then((res) => res.json())
      .then((data) => setEvents(data.events || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="relative max-w-5xl mx-auto px-4">
      {/* Rankings sidebar — positioned to the left of the main content, doesn't affect layout */}
      <div className="hidden xl:block absolute right-full mr-4 top-0 w-[200px]">
        <div className="sticky top-20">
          <RankingSidebar />
        </div>
      </div>

      {/* Main content — stays centered */}
      <EventList events={events} loading={loading} />
    </div>
  );
}
