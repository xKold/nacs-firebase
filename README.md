# NACS - North American Counter-Strike

A CS2 esports statistics and event tracking platform built for the North American semi-professional scene.

**Live:** [nacs2x.web.app](https://nacs2x.web.app)

## Features

- **Events** — Dynamically aggregated from PandaScore (Fragadelphia, D2 Eagle Masters, CCT NA, Ace Masters, ESL Challenger, BLAST, and more) plus FACEIT-hosted ESEA leagues. Status updates on every refresh.
- **Live Matches** — Real-time match feed for NA teams across pro events and ESEA Advanced.
- **Brackets** — Double elimination brackets with upper/lower/grand final. Swiss stage rendering with HLTV-style round columns, W-L buckets, and advancement indicators.
- **Player Profiles** — Dual FACEIT/Pro tabs. FACEIT stats (K/D, HS%, win rate, ESEA division history). Pro stats from PandaScore (ADR, KAST, rating) and Grid.gg.
- **Team Profiles** — Rosters, match history, and tournament standings from both FACEIT and PandaScore/Grid.gg. Accessible by FACEIT ID or PandaScore team name.
- **Match Stats** — Normalized stats pipeline across three data sources (FACEIT, PandaScore, Grid.gg) with per-map breakdowns and dynamic stat columns.
- **VRS Rankings** — Official Valve Regional Standings from GitHub, with Americas/NA/SA/Europe/Asia/Global filtering. NA sidebar on main pages.
- **Prize Pools** — Displayed for events with prize data from PandaScore.

## Data Sources

| Source | What it provides |
|---|---|
| **FACEIT** | ESEA leagues, player stats, match history, championship data |
| **PandaScore** | Pro events, brackets, rosters, tournament standings, prize pools |
| **Grid.gg** | Per-player match stats (ADR, K/D/A) for events with official data feeds |
| **Valve GitHub** | Official VRS team rankings by region |

## Tech Stack

- Next.js 16 / React 19 / TypeScript
- Tailwind CSS 4
- Firebase Hosting + Cloud Functions
