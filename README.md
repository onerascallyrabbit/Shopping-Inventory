<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Aisle Be Back — Smart Shopping Tracker

A mobile-first PWA for tracking grocery price history, household inventory, a shared family
shopping list, a wine/beer/spirits cellar, and AI meal planning.

## Run locally

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Create a `.env` file at the repo root with the variables listed in `AGENTS.md`
   (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `API_KEY`, `CLIENT_ID_KROGER`,
   `CLIENT_SECRET_KROGER`). Without them the app still runs, but in offline/guest mode.
3. Run the app: `npm run dev` → http://localhost:3000

## Documentation for coding agents

- [`AGENTS.md`](AGENTS.md) — commands, conventions, schema, and known bugs/traps.
- [`docs/PROJECT_SUMMARY.md`](docs/PROJECT_SUMMARY.md) — what the app does, tech stack, architecture.
- [`docs/FEATURES.md`](docs/FEATURES.md) — feature-by-feature description of every screen and modal.
