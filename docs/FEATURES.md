# Aisle Be Back — Feature Description

Detailed walkthrough of every screen, modal, and capability. Component file paths are relative to
`components/` unless noted. Prop flow is described in `AGENTS.md` (File map) and `PROJECT_SUMMARY.md`.

---

## 1. Onboarding / Auth

- **Sign-in gate (`App.tsx`)** — first-run screen: **"Sign in with Google"** (Supabase OAuth,
  disabled if no Supabase env) or **"Continue as Guest"** (sets `localStorage.pricewise_is_guest`,
  all data local-only).
- **Guest mode** — no DB sync; profile persisted to `localStorage` under `aisle_be_back_profile`.
  `DiagnosticBanner` shows a "Local Session" indicator and an **Exit Guest Mode** button.

## 2. App shell

- **`Header.tsx`** — logo/title, active family badge, spinning sync indicator while `loading`,
  avatar (Google photo, click to sign out after `confirm`), and the Settings gear.
- **`BottomNav.tsx`** — six fixed bottom tabs: **Track, Stock, Cellar, Meals, List, Shop**.
  Settings is reached from the Header; there is no center "+" button (dead `onAddClick` prop).
- **FAB quick-add (`App.tsx`)** — floating `+` button (bottom-right) opens a speed-dial menu:
  Voice Add, Track Price, Add to Stock, Add to Cellar, Add to List.
- **`InstallPrompt.tsx`** — PWA install bottom-sheet. Android/iOS handling, manual trigger from
  Settings, `sessionStorage` dismissal gate.

## 3. Track — Dashboard (`Dashboard.tsx`)

- **Action Center** — quick-entry buttons (Type / Photo / UPC) that dispatch
  `openAddModal` CustomEvent to open the global `AddItemModal` in the right mode.
- **Top Value Deals** — per product, the lowest unit-price history record, sorted best-first.
  Tap "+ List" to add to the shopping list with an inline qty/unit prompt.
- **Recent Activity** — the 5 most recent price records across all products.
- ⚠️ Crashes if any product has an empty `history` (`best.price.toFixed(2)`) — guard before rendering.

## 4. Track — Item Browser (`ItemBrowser.tsx`)

- Search across name/variety/brand/subCategory; category chips filter.
- Expand a product to see its full price history; "+ List" to add; **"Compare Web Prices"** runs
  `lookupMarketDetails` (Gemini + Google Search grounding) and renders cited sources as links.
- ⚠️ Currently **unreachable** — no tab or default-tab option points at the `items` view.
- ⚠️ Same empty-history crash as Dashboard.

## 5. Price Entry — AddItemModal (`AddItemModal.tsx`) — the global add modal

Four input modes (tab-switchable):

1. **Manual (type)** — form: category (+ custom sub-categories), item name, variety, brand,
   origin, grade/style, unit size + measure + container, store, price, quantity, notes.
   Shows a **price memory** hint (historical best unit price for the typed item) and store
   suggestions (history ∪ saved stores ∪ `NATIONAL_STORES`).
2. **Photo (product)** — camera/file capture; sends the image to `identify-product` (Gemini
   vision) to auto-fill category/item/variety/brand/price/unit/store.
3. **UPC (barcode)** — live camera scan via `html5-qrcode`; looks the barcode up in **Kroger**
   (`lookupKrogerProduct`) and can run a **price comparison** across nearby Kroger stores
   (`compareKrogerPrices`). Choosing a comparison store also sets your preferred Kroger store.
4. **Voice** — embeds `VoiceInventoryAdd` (see below) to parse a spoken command into one or more
   inventory items, then submits them to inventory.

Submit paths: save a price record (onSubmit), or route to inventory (onAddToInventory). Catalog
matching by barcode or name+variety+brand; creates/updates the `products` row and `price_history`.

## 6. Stock — Inventory (`InventoryView.tsx`)

- Browse inventory grouped by storage location (aisle), then by shelf when one is selected.
- Search; filter by location, sub-location, and category.
- Per-item quantity +/- (clamped at zero); reaching zero prompts **"Out of Stock → add to
  shopping list?"**.
- Edit items via an inline modal (all `InventoryItem` fields incl. purchase/expiration/opened
  dates, barcode, image URL).
- **Copy names** to clipboard (deduped list), and **bulk CSV import** via `CsvImportModal`.
- ⚠️ Sub-location filter is dead state (`activeSubLocation` never changes).

## 7. Bulk Import — CsvImportModal (`CsvImportModal.tsx`)

Three-step wizard: upload `.csv`/paste tab- or comma-separated data → map columns to inventory
fields (heuristic auto-map) and choose destination location/shelf → review/edit each parsed item,
then import (batch upsert).
- ⚠️ Known mapping bug: unit-size/measure columns map to snake_case option values
  (`unit_size`/`unit_measure`) but the code reads camelCase keys — values are silently lost.
  `purchaseDate` has no dropdown option either.

## 8. List — Shopping List (`ShoppingList.tsx`)

- Shared (family) list. Add items (with qty/unit), toggle complete, remove.
- **Smart suggestion** — best unit price from tracked history.
- **Kroger match** — when Kroger is enabled + a preferred store is set, searches
  `/api/kroger/products` per item; results inline, confirmed via `KrogerProductDetailsModal`
  (price/sale/stock/coupons), writing `krogerProductId`/`krogerData`/`manualStore` to the item.
- **Stock directly** — opens `StockPurchasedModal` to move the purchased item into inventory.
- Cart history section shows completed items of the session.

## 9. Trip Plan — Shop (`ShopPlan.tsx`)

- Groups active list items by their best-price store.
- Computes distance (haversine, `utils.geo.ts`) from your geolocation to each saved store with
  coords, and estimates fuel cost from active vehicle MPG + `profile.gasPrice`.
- Re-assign items between stores via HTML5 drag-and-drop or a Move button (`overrideStoreForListItem`).
- Toggle purchased / remove; **Stock It** moves items to inventory (`StockPurchasedModal`).
- ⚠️ Shows hardcoded `"2.4 mi"` / `"$0.45 gas"` when geolocation/coords are unavailable — should
  say "unknown" instead.

## 10. Cellar (`CellarView.tsx`)

- Stat cards + tabs by category (Wine / Beer / Spirits) + sub-category chips (e.g. Red/White/Rosé).
- Per-item qty +/-; **consume** modal (occasion, notes) that decrements and logs to
  `consumption_logs`; **low-stock alerts** with one-tap restock to the shopping list
  (category `'Cellar Restock'`).
- Add/edit modal with category-specific fields: wine colors/varietals, beer styles, spirit
  classes/styles, producer, vintage, ABV, price, rating, opened flag, location, notes.
- Forms are read via `document.getElementById('cellar-…')` at save time (DOM-coupled — handle
  with care when refactoring).

## 11. Meals — Meal Planner (`MealPlanner.tsx`)

- Filter chips: All / Ready Now (100% match) / Close Matches (≥75%).
- **New Ideas** button with a "Meal Focus" prompt (e.g. "high-protein, 30 min") → server
  `generate-meals` (Gemini) from current inventory, stored per family.
- Meal cards → detail modal: ingredients (each marked missing → **Add to List**), instructions,
  suggested cellar pairings (top 2 cellar items), star rating (`meal_ratings`, averaged), and
  **I Cooked This** (increments cook count / sets last cooked).

## 12. Settings (`SettingsView.tsx`)

- **System status** — DB (Supabase ping) + Gemini/Kroger key presence from `/api/health`.
- **Family Hub** — create a family (⚠️ button broken, see AGENTS.md; invite-code input works),
  join by invite code (`?invite=` URL param pre-fills), copy invite link, view invite code.
- **Storage** — opens `StorageLocationsModal`: add/delete/reorder aisles (persisted), manage
  shelves (sub-locations) per aisle.
- **Taxonomy** — opens `TaxonomyModal`: add/remove custom categories and per-category
  sub-categories/tags (family-scoped).
- **Preferences** — zip, gas price, default landing tab, active vehicle, Kroger enable + preferred
  store picker (`KrogerStorePicker`).
- **PWA** — "Add to Home Screen" button dispatches `trigger-install-prompt`.
- Sign out (Header avatar also signs out).

## 13. Voice Input — VoiceInventoryAdd (`VoiceInventoryAdd.tsx`)

- Web Speech API (`SpeechRecognition`), continuous + interim results, "Tap to Stop".
- Sends transcript + available locations/shelves to `/api/parse-voice-inventory` (Gemini) →
  returns a JSON array of inventory items with locationId matched to real locations.
- Renders editable confirmation cards (name/brand/variety/qty/unit/category/location/container/
  shelf); **Confirm & Add All** submits each to `onItemParsed`.
- ⚠️ No unmount cleanup; no-op `onend` can leave the UI stuck "listening"; multi-item confirm in
  AddItemModal closes after the first item.

## 14. Kroger modules

- **`api/kroger/_utils.js`** — cached OAuth2 client-credentials token (`scope=product.compact`).
- **Products** — search by `term` or `upc` at a location; used by shopping-list matching,
  AddItemModal UPC mode, and price comparison.
- **Locations** — Kroger stores near a ZIP (used by `KrogerStorePicker`).
- **Compare** — one UPC's price across nearby stores (promo/regular price, on-sale, in-stock,
  distance, image).
- **Coupons** — best-effort digital coupon lookup (empty array on failure — client-credential
  scope often can't return clipped coupons).

## 15. AI (Gemini) modules

- `identify-product` — vision → structured product/price JSON (barcode/product/tag modes).
- `parse-voice-inventory` — transcript → inventory item array (location matching, quantity/unit
  disambiguation, container/unitMeasure extraction).
- `generate-meals` — inventory JSON → meal ideas with ingredients/instructions/match %.
- `search-store` — store query + location → Google Maps-grounded address/hours.
- `lookup-market` — item → Google Search-grounded average US price + sources.
