export interface EseaEventConfig {
  id: string;
  name: string;
  region: string;
  beginAt: string | null;
  endAt: string | null;
}

export const eseaEvents: EseaEventConfig[] = [
  // S57
  {
    id: '5a03dd5a-cd26-412c-a9c4-1100b2ddc6f7',
    name: 'ESEA S57 NA Advanced - Regular Season',
    region: 'North America',
    beginAt: '2026-04-06T00:00:00Z',
    endAt: null,
  },
  // S56
  {
    id: '457b4ca1-6c07-4016-a87a-6aaa77c75a2d',
    name: 'ESEA S56 NA Advanced - Regular Season',
    region: 'North America',
    beginAt: '2026-01-01T00:00:00Z',
    endAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 'b1283afe-c2e7-411e-a14a-64e9cec43a17',
    name: 'ESEA S56 NA Advanced - Playoffs',
    region: 'North America',
    beginAt: '2026-03-01T00:00:00Z',
    endAt: '2026-03-20T00:00:00Z',
  },
  // Other FACEIT championships
  {
    id: '846911c3-a662-41d7-8f45-973ef4e873bf',
    name: 'IEM Atlanta 2026 - Americas Open Qualifier',
    region: 'North America',
    beginAt: '2026-02-07T00:00:00Z',
    endAt: '2026-02-10T00:00:00Z',
  },
  {
    id: 'edcde162-bd82-4226-9c24-79ce537d80ec',
    name: 'PrizePicks NA Revival Series February 2026',
    region: 'North America',
    beginAt: '2026-02-13T00:00:00Z',
    endAt: '2026-02-16T00:00:00Z',
  },
  {
    id: 'f56331e8-131a-4c50-b7db-eec8b010ff98',
    name: 'Off Season Shenanigans S8',
    region: 'North America',
    beginAt: '2025-06-01T00:00:00Z',
    endAt: '2025-07-01T00:00:00Z',
  },
  {
    id: '81e36970-81ec-4e53-b2af-c0a1c0b52938',
    name: 'Off Season Shenanigans S8 Playoffs',
    region: 'North America',
    beginAt: '2025-07-01T00:00:00Z',
    endAt: '2025-08-01T00:00:00Z',
  },
];
