'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function TeamViewTabs({
  activeView,
  hasProData,
}: {
  activeView: 'faceit' | 'pro';
  hasProData: boolean;
}) {
  const searchParams = useSearchParams();
  const championship = searchParams.get('championship');

  function buildHref(view: string) {
    const params = new URLSearchParams();
    params.set('view', view);
    if (championship) params.set('championship', championship);
    return `?${params.toString()}`;
  }

  return (
    <div className="flex items-center gap-1 p-1 bg-surface-hover/50 rounded-lg border border-border mb-6 w-fit">
      <Link
        href={buildHref('faceit')}
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
          activeView === 'faceit'
            ? 'bg-accent text-white shadow-sm'
            : 'text-text-secondary hover:text-text'
        }`}
      >
        FACEIT Stats
      </Link>
      {hasProData ? (
        <Link
          href={buildHref('pro')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
            activeView === 'pro'
              ? 'bg-accent text-white shadow-sm'
              : 'text-text-secondary hover:text-text'
          }`}
        >
          Pro Overview
        </Link>
      ) : (
        <span className="px-4 py-1.5 rounded-md text-sm font-medium text-text-muted cursor-not-allowed">
          Pro Overview (N/A)
        </span>
      )}
    </div>
  );
}
