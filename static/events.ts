// ./static/events.ts
export type Event = {
  id: string;
  name: string;
  region: string;
  startDate: string;
  type: 'championship' | 'league' | 'external';
  status: 'ongoing' | 'upcoming' | 'completed';
  source: 'faceit' | 'pandascore';
  leagueId?: string;
  seasonId?: string;
  externalUrl?: string;
};

export const events: Event[] = [
  {
    id: '457b4ca1-6c07-4016-a87a-6aaa77c75a2d',
    name: 'ESEA S56 NA Advanced',
    region: 'North America',
    startDate: '2026-01-01',
    type: 'championship',
    status: 'ongoing',
    source: 'faceit',
  },
  {
    id: '846911c3-a662-41d7-8f45-973ef4e873bf',
    name: 'IEM Atlanta 2026 - Americas Open Qualifier - NA Servers',
    region: 'North America',
    startDate: '2026-02-07',
    type: 'championship',
    status: 'completed',
    source: 'faceit',
  },
  {
    id: 'edcde162-bd82-4226-9c24-79ce537d80ec',
    name: 'PrizePicks NA Revival Series February 2026 - Open Qualifier',
    region: 'North America',
    startDate: '2026-02-13',
    type: 'championship',
    status: 'upcoming',
    source: 'faceit',
  },
  {
    id: 'f56331e8-131a-4c50-b7db-eec8b010ff98',
    name: 'Off Season Shenanigans S8',
    region: 'North America',
    startDate: '2025-06-01',
    type: 'championship',
    status: 'completed',
    source: 'faceit',
  },
  {
    id: '81e36970-81ec-4e53-b2af-c0a1c0b52938',
    name: 'Off Season Shenanigans S8 Playoffs',
    region: 'North America',
    startDate: '2025-07-01',
    type: 'championship',
    status: 'completed',
    source: 'faceit',
  },
];

export function getEventById(id: string): Event | undefined {
  return events.find(event => event.id === id);
}

export function getEventByLeagueAndSeason(leagueId: string, seasonId: string): Event | undefined {
  return events.find(event =>
    event.type === 'league' &&
    event.leagueId === leagueId &&
    event.seasonId === seasonId
  );
}
