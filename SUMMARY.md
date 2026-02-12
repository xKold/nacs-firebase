# NACS Website — Summary & Next Steps

## Tech Stack
- **Next.js 16.1.6** (Turbopack) + React 19.2
- **Tailwind CSS v4** with custom theme (dark CS-inspired palette)
- **FACEIT Data API v4** — ESEA matches, standings, player stats, team rosters
- **PandaScore API** (free tier) — pro CS2 tournament listings, brackets, rosters, match scores
- Firebase Hosting (staging + production targets)

## Architecture Overview

### Homepage (`app/page.tsx`)
- Two-column dashboard: NA Events (left) + Global Pro CS2 (right)
- PandaScore tournaments grouped by `serie.id` — multi-stage events appear as one entry
- `groupBySerie()` aggregates status/tier/dates, routes to `/matches/pro/serie/{serieId}`
- Events sorted: ongoing (pulsing red) → upcoming (yellow) → completed (grey)
- ISR caching: `revalidate: 60`

### Serie Page (`app/matches/pro/serie/[serieId]/`)
- Server component fetches all tournaments in a serie + their brackets in parallel
- `SerieTabs.tsx` — client component with pill tabs per stage, auto-selects live stage
- Renders bracket view or list fallback using shared bracket components

### Shared Bracket Module (`app/matches/pro/components/bracket.tsx`)
- Extracted types: `PSTeam`, `PSGame`, `PSMatch`, `PSBracketMatch`, `PSTournament`
- `parseBracket()` — groups bracket matches into rounds
- Components: `TierBadge`, `BracketMatchCard`, `BracketConnectors`, `BracketSection`, `ListMatchCard`
- Used by tournament page and serie tabs

### Match Pages
- **FACEIT** (`app/matches/match/[id]/page.tsx`) — HLTV-style gradient header, team placeholders, map result cards with half scores `(7; 6; 3)`, normalized stats table
- **PandaScore** (`app/matches/pro/match/[id]/page.tsx`) — gradient header with team logos, status badges (Live/Match Over/Upcoming), map cards with winner checkmarks, player rosters with photos + country flags, stream buttons

### Stats System
- **Normalized types** (`lib/types/match-stats.ts`) — `NormalizedPlayerStat`, `NormalizedMapStats`, `NormalizedMatchStats`, column definitions with format/color functions
- **FACEIT normalizer** (`lib/normalizers/faceit-stats.ts`) — transforms FACEIT API response, extracts half scores, K/R Ratio, MVPs, multi-kills
- **Shared display** (`app/components/MatchStatsTable.tsx`) — map tabs (All Maps + per-map), side filter toggle, dynamic columns driven by `availableColumns`, team header bars, alternating rows sorted by rating or kills

### Other Pages
- **Championship** (`app/matches/event/[championshipId]/`) — two-column: standings table + ongoing/upcoming matches
- **Team** (`app/teams/[teamId]/`) — roster with player links, match history
- **Player** (`app/players/[playerId]/`) — header with ELO/skill level, lifetime stats grid, team list, match history
- **Event List** (`app/components/EventList.tsx`) — unified card for FACEIT + PandaScore events, stage badges for multi-tournament series

## API Keys & Data Sources

| Source | Purpose | Key Location |
|--------|---------|-------------|
| FACEIT Data API v4 | ESEA matches, standings, player stats, team rosters | `.env.local` → `FACEIT_API_KEY` |
| PandaScore | Pro CS2 event listings, brackets, rosters, match scores | `.env.local` → `PANDASCORE_API_KEY` |
| Liquipedia | (Future) Detailed match stats (K/D, ADR, Rating) | Waiting for API key |

## Known Issues
- `@g-loot/react-tournament-brackets` has peer dep on React 18 (works fine with 19, just npm warnings)
- PandaScore free tier doesn't provide per-player match stats or map-level round scores
- Dev server caching: if you see stale errors, kill server → delete `.next` → restart

## Next Steps

### Priority 1: Liquipedia API Integration
- Waiting for API key approval
- Will provide detailed match stats (K/D, ADR, KAST, Rating) that PandaScore free tier lacks
- Normalized stats types + MatchStatsTable component already built and ready to accept a new data source

### Priority 2: Match Page Enhancements
- Per-player stats for PandaScore matches (blocked on Liquipedia API key)
- BO1 display: hide "Overall" tab when only 1 map
- Round-by-round timeline if API supports it

### Priority 3: Standings Visual Improvement
- Team logos, alternating row backgrounds, better spacing
- Games played column, win percentage, form indicator (last 5 results)
- Group labels if championship has groups

### Priority 4: Player Page Overhaul (HLTV-style)
- Rating, impact, opening kills, clutch stats
- Per-map breakdown, performance trends, head-to-head records

### Priority 5: Search Feature
- Search players by nickname, teams by name
- FACEIT search API with autocomplete/typeahead

### Priority 6: Auto-Fetch ESEA Events
- ESEA Organizer ID: `08b06cfc-74d0-454b-9a51-feda4b6b18da`
- Replace hardcoded `static/events.ts` with dynamic fetching via `/organizers/{id}/championships`
