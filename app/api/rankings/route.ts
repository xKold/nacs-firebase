import { NextRequest, NextResponse } from 'next/server';

interface VRSTeam {
  rank: number;
  points: number;
  name: string;
  roster: string[];
}

const VALID_REGIONS = ['americas', 'europe', 'asia', 'global'] as const;
type Region = (typeof VALID_REGIONS)[number];

function parseMarkdownTable(md: string): VRSTeam[] {
  const lines = md.split('\n');
  const teams: VRSTeam[] = [];

  for (const line of lines) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
    if (cells.length < 4) continue;

    const rank = parseInt(cells[0]);
    if (isNaN(rank)) continue;

    const points = parseInt(cells[1]);
    const name = cells[2];
    const roster = cells[3].split(',').map((p) => p.trim()).filter(Boolean);

    teams.push({ rank, points, name, roster });
  }

  return teams;
}

export async function GET(request: NextRequest) {
  const region = (request.nextUrl.searchParams.get('region') || 'americas') as Region;
  const validRegion = VALID_REGIONS.includes(region) ? region : 'americas';

  try {
    // Find the latest year folder
    const yearRes = await fetch(
      'https://api.github.com/repos/ValveSoftware/counter-strike_regional_standings/contents/live',
      { next: { revalidate: 3600 } },
    );

    if (!yearRes.ok) {
      return NextResponse.json({ teams: [], updatedAt: null, region: validRegion });
    }

    const years = (await yearRes.json()) as { name: string }[];
    const latestYear = years
      .map((y) => y.name)
      .filter((n) => /^\d{4}$/.test(n))
      .sort()
      .reverse()[0];

    if (!latestYear) {
      return NextResponse.json({ teams: [], updatedAt: null, region: validRegion });
    }

    const indexRes = await fetch(
      `https://api.github.com/repos/ValveSoftware/counter-strike_regional_standings/contents/live/${latestYear}`,
      { next: { revalidate: 3600 } },
    );

    if (!indexRes.ok) {
      return NextResponse.json({ teams: [], updatedAt: null, region: validRegion });
    }

    const files = (await indexRes.json()) as { name: string; download_url: string }[];
    const regionFiles = files
      .filter((f) => f.name.startsWith(`standings_${validRegion}_`) && f.name.endsWith('.md'))
      .sort((a, b) => b.name.localeCompare(a.name));

    if (regionFiles.length === 0) {
      return NextResponse.json({ teams: [], updatedAt: null, region: validRegion });
    }

    const latestFile = regionFiles[0];
    const dateMatch = latestFile.name.match(/(\d{4})_(\d{2})_(\d{2})/);
    const updatedAt = dateMatch
      ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`
      : null;

    const mdRes = await fetch(latestFile.download_url, {
      next: { revalidate: 3600 },
    });

    if (!mdRes.ok) {
      return NextResponse.json({ teams: [], updatedAt, region: validRegion });
    }

    const md = await mdRes.text();
    const teams = parseMarkdownTable(md);

    return NextResponse.json({ teams, updatedAt, region: validRegion });
  } catch {
    return NextResponse.json({ teams: [], updatedAt: null, region: validRegion });
  }
}
