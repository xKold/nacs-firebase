import { NextResponse } from 'next/server';

const FACEIT_API_KEY = process.env.FACEIT_API_KEY;

async function fetchAllPages(baseUrl: string) {
  const allItems: any[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const separator = baseUrl.includes('?') ? '&' : '?';
    const res = await fetch(`${baseUrl}${separator}limit=${limit}&offset=${offset}`, {
      headers: {
        Authorization: `Bearer ${FACEIT_API_KEY}`,
      },
    });
    if (!res.ok) {
      if (allItems.length === 0) {
        return { error: true, status: res.status };
      }
      break;
    }
    const data = await res.json();
    const items = data.items || [];
    allItems.push(...items);
    if (items.length < limit) break;
    offset += limit;
  }

  return { error: false, items: allItems };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const championshipId = searchParams.get('championshipId');
  const leagueId = searchParams.get('leagueId');
  const seasonId = searchParams.get('seasonId');

  let baseUrl = '';
  if (championshipId) {
    baseUrl = `https://open.faceit.com/data/v4/championships/${championshipId}/matches`;
  } else if (leagueId && seasonId) {
    baseUrl = `https://open.faceit.com/data/v4/leagues/${leagueId}/seasons/${seasonId}/matches`;
  } else {
    return NextResponse.json(
      { error: 'Missing required parameters: either championshipId or leagueId + seasonId' },
      { status: 400 }
    );
  }

  const result = await fetchAllPages(baseUrl);

  if (result.error) {
    return NextResponse.json(
      { error: 'Failed to fetch from FACEIT API' },
      { status: (result as any).status }
    );
  }

  return NextResponse.json({ items: result.items });
}
