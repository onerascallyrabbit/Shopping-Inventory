# AGENTS.md — Instructions for Coding Agents

Working guide for **Aisle Be Back** ("Smart Shopping Tracker"), a mobile-first PWA that tracks
grocery price history, household inventory, a shared family shopping list, a wine/beer/spirits
cellar, and AI meal planning. Read this before modifying code.

---

## Quick facts

- **Frontend:** React 19 + TypeScript + Tailwind CSS v4 (via `@tailwindcss/vite`), Vite 6.
- **Backend:** Single Node/Express server (`server.ts`) that serves the SPA and proxies `/api/*`
  routes to handler files in `api/`. In dev it runs Vite middleware; in production it serves `dist/`.
- **Database:** Supabase (Postgres) — auth (Google OAuth) + all app tables. Accessed directly from
  the browser with the anon key; there are **no RPC/stored procedures**.
- **AI:** Google Gemini (`@google/genai`), called server-side from `api/` handlers with `API_KEY`.
- **External API:** Kroger (`api/kroger/*`) via OAuth2 client-credentials token cached in `_utils.js`.

## Commands

| Task | Command |
|---|---|
| Run the app (dev) | `npm run dev` → http://localhost:3000 |
| Type-check | `npm run lint` (= `tsc --noEmit`) |
| Production build | `npm run build` (= `vite build`) |
| Preview build | `npm run preview` |

No test framework is configured. Verification = `npm run lint` + manual run of `npm run dev`.

## Environment variables (required)

Copy to a `.env` file at the repo root. `server.ts` loads `.env` via `dotenv`; Vite's `define`
(in `vite.config.ts`) loads `.env`/`.env.local` via `loadEnv`. **Client code can only see
`VITE_`-prefixed vars** unless defined via the `define` block.

| Variable | Used by | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | browser (`services/supabaseService.ts`) | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | browser | Supabase anon key |
| `API_KEY` | server (`api/*.js`) | Gemini API key (aliased from `GEMINI_API_KEY` in the Vite `define` block) |
| `CLIENT_ID_KROGER` | server (`api/kroger/_utils.js`) | Kroger OAuth client id |
| `CLIENT_SECRET_KROGER` | server (`api/kroger/_utils.js`) | Kroger OAuth client secret |

If `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are missing, `supabase` is `null` and the app runs
in offline/guest mode. `GET /api/health` reports which keys are present.

## File map

- `App.tsx` — app shell: tab routing, guest/sign-in gate, global `AddItemModal`, FAB quick-add.
- `index.tsx` — React bootstrap, service worker registration, `beforeinstallprompt` capture.
- `hooks/useAppData.ts` — **the central state + data-sync hook.** Owns all domain state
  (products, inventory, list, cellar, meals, taxonomy, profile, family), optimistic updates, and
  Supabase sync. Most business rules (quantity clamp-to-zero, category delete guards, etc.) live here.
- `services/supabaseService.ts` — every Supabase query/mutation (camelCase API objects ↔
  snake_case DB columns), plus Google sign-in/out.
- `services/geminiService.ts` — client wrappers for `/api/identify-product`, `/api/search-store`,
  `/api/lookup-market`, `/api/generate-meals`.
- `services/krogerService.ts` — client wrappers for `/api/kroger/{products,locations,compare}`.
- `api/*.js` — server handlers (ESM, default-exported `(req, res)`). Mounted in `server.ts` with `app.all`.
- `constants/index.ts` — `DEFAULT_CATEGORIES`, `SUB_CATEGORIES`, `UNITS`, `CONTAINER_TYPES`,
  `DEFAULT_STORAGE`, `NATIONAL_STORES`.
- `types.ts` — all domain interfaces (`Product`, `InventoryItem`, `ShoppingItem`, `CellarItem`, …).
- `utils.geo.ts` — haversine distance + geolocation helpers.
- `sw.js`, `manifest.json`, `index.html` — PWA bits (cache-first SW, install manifest, boot overlay).

## Conventions

- **camelCase in TypeScript ↔ snake_case in Supabase.** All row↔object conversion happens in
  `supabaseService.ts`. When adding columns, update both the mapping in this file and the
  `types.ts` interface. Uphold this split — do not sprinkle snake_case into components.
- **State shape:** components receive data + callbacks from `useAppData` via `App.tsx`. Mutations
  optimistically update local state first, then sync (with `try/catch` that calls `loadAllData()`
  to resync on failure). Follow this pattern for new mutations.
- **Real-time:** a Supabase `postgres_changes` channel in `useAppData` subscribes to inventory,
  shopping_list, custom_categories, custom_sub_categories, meal_ideas, storage_locations,
  cellar_items, consumption_logs. `loadAllData(true)` (silent) is the reload-on-change callback.
- **DB column naming:** follow the existing snake_case columns (see "Supabase schema" below).
- **Modals:** keep modals as local state + conditional render. Cross-view events use custom
  `CustomEvent`s (`openAddModal`, `app-installable`, `trigger-install-prompt`).
- **No comments unless asked.** Keep code style consistent with surrounding files (components are
  heavily styled with Tailwind utility classes; icons are inline SVGs or `lucide-react`).
- Type-check with `npm run lint` after any edit; fix errors you introduce. Avoid adding new
  `as any` casts — several exist already and should not be extended.
- **Guest mode:** no user → data is local-only (profile persisted to `localStorage` under
  `aisle_be_back_profile`; guest flag under `pricewise_is_guest`). Ensure new features degrade
  gracefully when `user` is null.

## Supabase schema (tables used by this app)

`profiles` (id=user id, location_label, zip, gas_price, category_order, active_vehicle_id,
share_prices, family_id, default_tab, kroger_store_id, kroger_store_name, enable_kroger) ·
`products` (id, category, sub_category, item_name, variety, brand, barcode, origin, grade, style,
unit_size, unit_measure, container, notes) · `price_history` (id, product_id, user_id, store,
price, quantity, unit, unit_size, unit_measure, container, date, image_url, is_public) ·
`inventory` (id, product_id, item_name, category, sub_category, variety, brand, grade, style,
origin, sub_location, quantity, unit, unit_size, unit_measure, container, location_id,
purchase_date, expiration_date, opened_date, notes, barcode, image_url, user_id, created_at,
updated_at) · `shopping_list` (id, product_id, name, needed_quantity, unit, is_completed,
manual_store, category, user_id, kroger_product_id, kroger_data) · `storage_locations` (id, name,
user_id, sort_order) · `sub_locations` (id, location_id, name, user_id) · `stores` (id, user_id,
name, address, lat, lng, phone, hours, zip, is_public) · `vehicles` (id, user_id, name, mpg) ·
`families` (id, name, invite_code, created_by) · `custom_categories` (id, family_id, name) ·
`custom_sub_categories` (id, family_id, category_name, name) · `meal_ideas` (id, family_id, title,
description, difficulty, cook_time, match_percentage, ingredients, instructions, generated_at,
cook_count, last_cooked, rating) · `meal_ratings` (meal_id, user_id, rating) · `cellar_items` (id,
user_id, family_id, producer, name, category, sub_category, type, quantity, unit,
low_stock_threshold, is_opened, notes, rating, vintage, abv, price, location, updated_at) ·
`consumption_logs` (id, item_id, quantity, date, occasion, notes).

## Known bugs / traps (do not re-introduce)

1. **Dashboard + ItemBrowser crash** on products with empty `history`
   (`best.price.toFixed(2)` where `best` is `undefined`). Guard before rendering.
2. **`ShoppingItem` type is missing `krogerData` / `krogerProductId`**, yet `ShoppingList.tsx`
   reads/writes them. Add the fields to `types.ts`.
3. **Settings "Create Hub" button is broken** (stale `familyName` closure in
   `SettingsView.tsx`); the invite-code input path works.
4. **`CsvImportModal`** maps unit-size/measure columns with mismatched option values
   (`unit_size`/`unit_measure`) vs camelCase keys (`unitSize`/`unitMeasure`) — values are silently
   lost. Also `purchaseDate` has no dropdown option.
5. **ShopPlan shows fake data** — hardcoded `"2.4 mi"` / `"$0.45 gas"` when geolocation or store
   coords are missing. Surface "unknown" instead.
6. **VoiceInventoryAdd** — no unmount cleanup for the speech recognizer; `onend` is a no-op so the
   UI can strand in "listening"; multi-item confirm in AddItemModal closes after the first item.
7. Dead props/code: `Dashboard.onTabChange`, `BottomNav.onAddClick`, `AddItemModal.onSaveToList` &
   `location`, `SettingsView.stores/vehicles` prop families, `TaxonomyModal.activeFamily`,
   `InventoryView.activeSubLocation`. The `items` tab (`ItemBrowser`) is unreachable via any UI.
8. `InstallPrompt` leaks the `app-installable` listener on its iOS branch.
9. `UNITS`, `getFullName`, and best-unit-price sorting are duplicated across several components —
   prefer `constants/index.ts` / shared helpers when touching them.

## API routes (server, `api/`)

- `POST /api/generate-meals` — Gemini meal ideas from inventory JSON. (Note: its `req.body`
  destructures `base64Image`/`mode` while the client sends `{inventory}`; client handles response.)
- `POST /api/identify-product` — Gemini vision: photo of barcode / product / price tag → structured JSON.
- `POST /api/parse-voice-inventory` — Gemini: transcript + available locations → array of inventory items.
- `POST /api/search-store` — Gemini + Google Maps grounding (store address/hours).
- `POST /api/lookup-market` — Gemini + Google Search grounding (average market price).
- `GET /api/kroger/auth` — returns cached Kroger token.
- `GET /api/kroger/products?term|upc&locationId&limit` — Kroger product search.
- `GET /api/kroger/locations?zip&radius&limit` — Kroger stores near zip.
- `GET /api/kroger/compare?upc&zip&radius&limit` — price across nearby Kroger stores.
- `GET /api/kroger/coupons?productId&locationId` — coupons (best-effort, empty on failure).
- `GET /api/health` — DB/Gemini/Kroger key presence.

## Getting started for an agent

1. `npm install`
2. Create `.env` with the vars above (see table). Without them, dev runs but is offline/guest.
3. `npm run dev`, open http://localhost:3000.
4. Sign in with Google (Supabase must be configured) or "Continue as Guest".
5. To verify a change: `npm run lint`, then exercise the relevant screen(s) in the browser.
