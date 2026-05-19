export type SearchSource = 'faceit' | 'pandascore';

export interface SearchResult {
  id: string;
  name: string;
  source: SearchSource;
  href: string;
  subtitle?: string;
  imageUrl?: string;
}

export interface SearchResponse {
  events: SearchResult[];
  teams: SearchResult[];
  players: SearchResult[];
}
