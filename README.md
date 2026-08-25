# STANCE

STANCE turns local civic reports into a shared, accountable public record for constituents, representatives, and administrators.

## Current Status

**Stance v0.x — Production build passing**

- 51 NYC Council Districts seeded
- 51 representatives linked to districts
- Official NYC Council representative data synced from NYC Open Data
- PostGIS district resolution
- Issue submission pipeline
- Duplicate detection fallback without requiring OpenAI
- Production TypeScript/build passing

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev