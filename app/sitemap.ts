import type { MetadataRoute } from 'next';

const BASE_URL = 'https://nacs2x.vercel.app';

interface EventEntry {
  href: string;
  beginAt?: string | null;
  external?: boolean;
}

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/matches`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE_URL}/rankings`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/roadmap`, lastModified: now, changeFrequency: 'weekly', priority: 0.4 },
  ];

  // Include current events (skip external-link entries and pagination-heavy dynamic routes)
  let eventPages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${BASE_URL}/api/events`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = (await res.json()) as { events?: EventEntry[] };
      eventPages = (data.events ?? [])
        .filter((e) => !e.external && e.href?.startsWith('/'))
        .slice(0, 200)
        .map((e) => ({
          url: `${BASE_URL}${e.href}`,
          lastModified: e.beginAt ? new Date(e.beginAt) : now,
          changeFrequency: 'daily' as const,
          priority: 0.7,
        }));
    }
  } catch {
    // If /api/events isn't reachable at sitemap-generation time, ship the static entries alone.
  }

  return [...staticPages, ...eventPages];
}
