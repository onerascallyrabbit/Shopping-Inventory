# Aisle Be Back — Project Summary

A **mobile-first Progressive Web App** ("Smart Shopping Tracker") that helps a household/family
track grocery prices over time, keep a searchable household inventory, share a shopping list,
manage a wine/beer/spirits cellar, and get AI meal suggestions from what's in stock.

> Status notes: this app evolved quickly through many incremental features. A lot of the code is
> hand-built with inline SVGs and Tailwind utility classes rather than a component library. Some
> edges are rough — see "Known issues" in `AGENTS.md`.

---

## What it does

1. **Price tracking** — log what you pay for a product at a store, with rich attributes
   (brand, variety, grade/style, origin, unit size/container). The app remembers your best
   unit price and flags "top value deals."
2. **Household inventory ("Stock")** — track what you own, where it's stored (aisle + shelf),
   quantities, expiry/opened dates. When something hits zero you're prompted to add it to the
   shopping list. Bulk import from CSV/paste.
3. **Shared shopping list** — family-synced list with quantities, best-price suggestions,
   Kroger product matching (price/sale/stock/coupons), and one-tap "stock it" to move a
   purchased item into inventory.
4. **Trip planning ("Shop")** — groups list items by best-price store, estimates driving
   distance (haversine) and fuel cost from your active vehicle + gas price, and lets you
   re-assign items between stores.
5. **Cellar** — track wine/beer/spirits bottles, vintages/ABV/ratings, opened status,
   consumption logging, and low-stock restock to the list.
6. **AI meal planner** — Gemini generates recipe ideas from your current inventory with
   match %, missing-ingredient "add to list," and cellar drink pairings.
7. **AI vision / voice input** — photograph a barcode, product, or price tag to auto-fill a
   price record; speak a sentence ("3 eggs and 2 milk in the fridge") to add multiple stock
   items at once.
8. **Kroger integration** — search products by term/UPC, find stores by ZIP, compare the same
   UPC's price across nearby Kroger locations, and look up digital coupons.
9. **Family hub** — create/join a family by invite code to share the shopping list, meal ideas,
   taxonomy, and cellar.
10. **PWA** — installable (manifest + cache-first service worker), boot overlay with error
    console, and a guest mode that works with no backend at all (localStorage only).

---

## Tech stack

| Layer | Technology |
|---|---|
| UI | React 19, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), `lucide-react` icons |
| Build | Vite 6 (`vite build` → `dist/`) |
| Server | Express 5 + Vite middleware (`tsx server.ts`) — single Node server, port 3000 |
| Database | Supabase (Postgres) via `@supabase/supabase-js` anon key, browser-side |
| Auth | Google OAuth (Supabase), plus guest mode |
| AI | `@google/genai` — Gemini 3 Flash (vision/voice/meals) and 2.5 Flash Lite (store search), server-side |
| External | Kroger Open API (OAuth2 client-credentials, `scope=product.compact`) |
| PWA | `sw.js` (cache-first), `manifest.json`, beforeinstallprompt flow |

No state library (Redux/Zustand etc.) — all state lives in one custom hook.

---

## Architecture at a glance

```
Browser (React)
  App.tsx ──► BottomNav tabs ──► view components (Dashboard, InventoryView, CellarView,
             MealPlanner, ShoppingList, ShopPlan, SettingsView)
             │                    │
             │                    ├─ modals owned locally (add/edit, CSV import, Kroger detail…)
             │                    └─ custom events: openAddModal / app-installable /
             │                       trigger-install-prompt
             ▼
  hooks/useAppData.ts  (single source of truth for all domain state)
     │ optimistic update → then sync
     ▼
  services/supabaseService.ts ──► Supabase (all tables, camelCase↔snake_case mapping)
  services/geminiService.ts  ──► POST /api/identify-product, /search-store, /lookup-market, /generate-meals
  services/krogerService.ts  ──► GET /api/kroger/products|locations|compare
     ▼
Express server.ts ──► api/*.js handlers (Gemini calls server-side with API_KEY; Kroger token
                     cached in api/kroger/_utils.js; /api/health status endpoint)
```

Key rule: **the browser talks to Supabase directly** (anon key, RLS) for CRUD, and to the Express
server only for AI and Kroger features (secrets must not reach the client). There are no Supabase
RPC/stored procedures — every mutation is a direct `supabase.from(...)` call.

---

## Data model highlights

- `products` = canonical grocery items (one row per product+variety+brand); `price_history` = a
  many-to-one log of observed prices per product. `Product.history` in the app is the joined result.
- `inventory` = physical stock, linked to `products` via `product_id` (or `'manual'`), located at
  `storage_locations` (`location_id`) with optional `sub_locations` shelf names.
- `shopping_list` = family items; `is_completed` keeps history of the current shopping session.
- Family sharing: rows are filtered by `family_id` (families, meal_ideas, cellar_items,
  custom_categories, custom_sub_categories) or `user_id`; the shared list itself is unscoped
  (RLS/table-level sharing — see AGENTS.md schema notes).

---

## Environment & run modes

- **Full mode** — all env vars set (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `API_KEY`,
  `CLIENT_ID_KROGER`, `CLIENT_SECRET_KROGER`). Google sign-in, DB sync, AI, Kroger all work.
- **Offline/guest mode** — no Supabase vars. `supabase` is `null`; user can "Continue as Guest";
  everything is local-only (profile in `localStorage`). AI/Kroger still work because they go
  through the server (as long as `API_KEY` / Kroger creds are set).
- `GET /api/health` reports which keys are present — useful sanity check before debugging.

---

## Gotchas worth knowing

- `server.ts` uses `dotenv` (loads `.env` only), but Vite's `define` uses `loadEnv` (loads
  `.env`, `.env.local`, mode-specific files). Keep needed vars in `.env`.
- `vite.config.ts` `define`s `process.env.API_KEY` and `process.env.GEMINI_API_KEY` from the
  `GEMINI_API_KEY` env var so browser code can read them; server handlers read `process.env.API_KEY`.
- The service worker is cache-first and caches `/`, so stale assets can persist during dev —
  hard-refresh or bump `CACHE_NAME` after SW changes.
- Tailwind classes are generated by the `@tailwindcss/vite` plugin; `tailwind.config.js` content
  globs include `components/`, `hooks/`, `App.tsx`, etc. New files under those roots are picked up.
- There is no lint ruleset beyond `tsc --noEmit` — "lint" == type-check.

---

## Related docs

- `AGENTS.md` — full instructions for coding agents (commands, conventions, schema, known bugs).
- `FEATURES.md` — detailed feature-by-feature description of every screen and modal.
- `build.txt` — chronological change log of feature work (newest on top).
