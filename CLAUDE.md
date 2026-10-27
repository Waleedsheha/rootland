# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

RootLand is a bilingual storefront and staff admin for an Egyptian hoodie brand, in English and right-to-left Arabic. It is a React 19 + Vite + Tailwind v4 SPA with **no app server**. The browser talks to a self-hosted **Supabase** (Auth, Postgres, Realtime) directly, so row level security and the database functions in `supabase/migrations/` are the only server-side enforcement.

The project was scaffolded in Google AI Studio. Several things are template leftovers that nothing in `src/` uses:
- the `@google/genai`, `express`, `dotenv` and `tsx` dependencies
- `GEMINI_API_KEY` and `APP_URL` in `.env.example`
- `metadata.json`
- `src/services/shippingService.ts` and `src/utils/adminHelpers.ts`

The "AI Fit" sizing tool is a deterministic local calculation in `fitRecommendationService.ts`. The brand was previously "ATELIER KEMET", which is why some storage keys and events still use a `kemet_` prefix.

## Commands

```bash
npm install --legacy-peer-deps                     # documented install (LAUNCH-STEPS.md); pnpm-lock.yaml is kept in sync too, bun.lock is stale
npm run dev                                        # Vite on port 3000, host 0.0.0.0
npm run build                                      # production build to dist/
npm run lint                                       # tsc --noEmit (type-check only; there is no ESLint)
npm test                                           # vitest run, all of src/__tests__/
npx vitest run src/__tests__/cartService.test.ts   # one file
npx vitest run -t "free delivery"                  # tests whose name matches
```

There is no Vitest config. Vitest reuses `vite.config.ts` and runs in the Node environment. Setting `DISABLE_HMR=true` turns off HMR and file watching (an AI Studio setting).

## Environment and deployment

- **There is only one Supabase, and it is production:** `https://rootlandbase.syvursoft.com`, self-hosted with Coolify. `.env.local` (gitignored) sets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for `npm run dev`; production builds read the same two public values from `.env.production`, which is committed on purpose. `src/lib/supabase.ts` throws if either is missing. Orders placed or admin edits made under `npm run dev` are real.
- `.env` (gitignored) holds the server secrets: service-role key, Postgres password, JWT secret, dashboard login. Never print them, never put them in a `VITE_` variable (Vite ships every `VITE_` value to the browser).
- **No tool deploys migrations.** Run each file in `supabase/migrations/` once, in order, in Supabase Studio's SQL editor or through pg-meta `/pg/query` with the service key. Migrations start with `set role postgres` and end with `notify pgrst, 'reload schema'` so the API sees new functions.
- `supabase/seed.sql` (settings rows, the 2 products, stock) already ran. `supabase/tests/store_checks.sql` checks row level security and the functions; run it inside `begin; … rollback;`.
- **Auth** is email and password. Email confirmation is on and must stay on: staff roles only count for confirmed emails. Confirmation and password-reset emails need SMTP in Coolify (`GOTRUE_SMTP_*`), and `GOTRUE_SITE_URL` / `ADDITIONAL_REDIRECT_URLS` must allow the site and `http://localhost:3000/**`.
- Hosting is Coolify, which builds the `Dockerfile` from GitHub: Node builds `dist/`, then nginx serves it on port 80 with the SPA fallback in `nginx.conf`. `public/_redirects` (Netlify) and `vercel.json` (Vercel) hold the same rewrite.
- `LAUNCH-STEPS.md` is the owner's manual launch checklist.

## Architecture

### State and data flow
- **Services are static classes** in `src/services/`. They keep in-memory caches backed by `localStorage` through `safeStorage` (`src/utils/storage.ts`, which falls back to memory). There is no global store. React context is used only for language (`LanguageContext`) and toasts.
- **Components sync through `window` events.** After a service mutates state, it dispatches one of `kemet_cart_updated`, `rootland_auth_updated`, `rootland_wishlist_updated`, `rootland_orders_updated`, `rootland_settings_updated`, `rootland_content_updated` or `rootland_password_recovery`. Listeners re-read through sync getters such as `CartService.getCart()`. Event names mix the `kemet_` and `rootland_` prefixes and must match exactly.
- **`main.tsx` loads the fonts, `settings.store` and `settings.content` before the first render.** `StoreSettingsService.getSettingsSync()` and `SiteContentService.getContentSync()` throw if read earlier. A failed load shows an error page; there are no built-in defaults at runtime.
- **`App.tsx` owns the live product list and every global modal.**
  - The product list comes from `DataService.subscribeToProducts` (realtime). `ProductsGate` shows loading and error states; there is no offline fallback.
  - Every product update also runs `CartService.syncPrices`, so bag prices follow the catalogue.
  - All modals close on route change. `navigateTo(route, param)` is passed down as `onNavigate`.
  - Any component can open the size guide by dispatching the `rootland_open_size_guide` CustomEvent with `detail: { productId }`.
- `dataService.ts` holds all table and function access: row mappers (snake_case → app types) and `liveQuery` (fetch, then refetch on realtime `postgres_changes`, debounced 250 ms). Row level security turns a forbidden update or delete into "0 rows", so staff writes select the changed rows and throw `NOT_ALLOWED` when nothing changed.
- `OrderService` caches the last 20 orders placed **in this browser** (`rootland_orders_v2`) so guests can reopen the confirmation page. The account page reads the customer's orders from the database.
- `AuthService` restores the session, loads the `profiles` row and exposes `isReady()`, `getCurrentUser()` and `getLoadError()`.

### Database invariants (change the code and a new migration together)
- Tables: `staff`, `audit_logs`, `profiles`, `products`, `product_variants`, `settings`, `orders`, `order_items`, `order_internal_notes`, `coupons`, `reviews`, `b2b_leads`. Row level security is on for all of them.
- Functions are `security definer`. Execute is revoked from `public`, `anon` and `authenticated`, then granted per entry point; a new function needs its own grant.
- **Checkout is one call, `place_order`.**
  - It recomputes unit prices (`product_active_price`: the sale price only when it is below the price), checks and decrements stock under row locks, checks pre-order limits, applies the coupon (`coupon_quote`) and adds the governorate fee from `settings.store` (free from `freeShippingThreshold` or with a free-delivery code).
  - The client sends `expectedTotal`; a mismatch raises `TOTAL_CHANGED:<total>` and the checkout reloads prices, settings and the coupon before the customer confirms again.
  - Other errors: `OUT_OF_STOCK:<name size>`, `STOCK_RECORD_MISSING:<variant>`, `PRODUCT_UNAVAILABLE:<product>`, `PREORDER_CLOSED|BACK_IN_STOCK|PREORDER_LIMIT:<name size>`, `COUPON_<reason>`, `TOO_MANY_ORDERS` and `INVALID_*`. `CheckoutPage` maps each to English and Arabic text.
  - Limits: 8 lines per order, 1–20 pieces per line, 5 orders per phone per hour.
- Order numbers look like `RL-YYMMDD-XXXX` (Cairo date). Payment is always cash on delivery: `payment_status` is `cash_on_delivery` until `delivered` sets `paid`.
- `update_order_status` (Owner, Orders): cancelled and refused return in-stock pieces once (`stock_released`); reopening takes them again and can fail with `OUT_OF_STOCK`; returned does not touch stock. Every change appends to `timeline` and `audit_logs`.
- Live stock is `product_variants.stock_count`. Staff set it with `set_variant_stock`. Pre-order lines never take stock; their cart id ends in `-preorder`.
- Guests track orders with `track_order(order number, phone)`, which returns no address.
- Reviews come in hidden through `submit_review` (with the customer's fit vote; at most 50 hidden reviews per hour). A review is a verified buyer's when the signed-in account has a delivered order of that product.
- Bulk requests come in through `submit_b2b_lead` (100–100000 pieces, 3 per hour per email).
- `settings_validate` rejects an incomplete `settings.store`: 27 governorates with id, name, nameArabic and a whole fee ≥ 0, a threshold above 0, and valid pre-order fields.
- `on_auth_user_created` creates the `profiles` row from the sign-up metadata (`full_name`, `phone`). `profiles_guard` protects `id`, `email` and `created_at`. `profiles.addresses` keeps up to 3 checkout addresses, newest first.

### Admin and roles
- `/admin` is `AdminPage.tsx` (sign-in, role check, live orders and products, new-order toasts) plus one file per tab in `src/pages/admin/`. The admin is English only and forces `dir="ltr"`.
- **There are four roles in the `staff` table (email primary key): `OWNER`, `ORDERS`, `CONTENT`, `MARKETING`.**
  - `ROLE_TABS` in `authService.ts` gates the UI. Row level security and `has_staff_role()` enforce the same split.
  - A role only counts once the account's email is confirmed (`current_staff_role()` joins `auth.users`).
  - `rootland.store@gmail.com` is the seeded owner; the `staff_guard` trigger keeps it an owner.
- There is no server code, so nothing emails the owner about new orders. The admin shows them live.

### Settings
- `StoreSettingsService` reads `settings.store`: contact and social links, the free-delivery threshold, the 27 governorate fees and delivery times, pre-orders, the tracking pixel IDs and `scrollSpeed` (the mouse-wheel step as a share of normal, 0.1–2; `SmoothScroll` follows it live). Only the owner can write it. Pixel IDs come only from here.
- `SiteContentService` reads `settings.content`: announcement and hero text, editable by the Content and Marketing roles too. An empty field shows the built-in i18n text.
- Their types and starting values live in `src/data/storeDefaults.ts`, used by the seed and the tests.

### Business rules
- Prices are in EGP only. Every order is cash on delivery with nothing paid upfront; Paymob was deferred.
- Delivery is a per-governorate fee, free once the subtotal reaches the threshold (3000 at launch).
- The launch catalogue is 2 hoodies in sizes L, XL and XXL only. `src/data/products.ts` is the seed source, not a runtime fallback. The fit tool never recommends S or M.
- Egyptian mobile numbers are validated by `normalizeEgyptMobile()` in `src/utils/phone.ts` (re-exported from `CheckoutPage.tsx`), the same rule as `public.normalize_egypt_mobile`.

## Bilingual UI
- `useLanguage()` provides `t`, `isArabic`, `dir`, `formatPrice`, `formatNumber` and `formatDate`.
  - Numbers always use Western digits (`latn`), even in Arabic.
  - Prices render as "EGP" or "ج.م".
  - `App.tsx` also passes an `isArabic` prop down, but several pages ignore it and use the hook.
- Three copy patterns coexist; match the one in the file you're editing:
  - `t('key')`, backed by the flat dictionaries `src/i18n/en.ts` and `src/i18n/ar.ts`. Add every key to both files (a test checks they match). A missing key falls back to English, then to the raw key.
  - Inline ternaries: `isArabic ? '…' : '…'`.
  - A local `L(en, ar)` helper in the Checkout, Order confirmation, Track order and B2B pages.
- Bilingual data uses paired fields such as `nameEn`/`nameAr` and `heroTitleEn`/`heroTitleAr`.
- The site always opens in English (`index.html` ships `<html lang="en" dir="ltr">`). Switching to Arabic lasts for the visit only and is not saved.

## Images
Images are referenced by string path, as `/src/assets/images/<name>.webp`, not imported. That path is served from `src/assets/images/` or `public/src/assets/images/`, so an image only needs to be in one of them; the two folders do not hold the same files. A build copies `public/` into `dist/`, then the `copy-src-images` plugin in `vite.config.ts` copies `src/assets/images/` on top, so the site ships both folders merged (for a name in both, dev serves the `public` copy and the build ships the `src` one). Tests still expect the product photos from `src/data/products.ts`, the fallback `hoodie_essential_black.webp` and the two hero cut-outs (`hoodie_cutout_black.webp`, `hoodie_cutout_offwhite.webp`) in both folders.

Images must be WebP and under 180 KB, which a test enforces. `sanitizeProduct()` rewrites legacy `.jpg` paths to `.webp` and supplies a fallback for missing images.

The product cards and product pages show a 360° turn instead of the photo for hoodies listed in `src/data/spin.ts`: 90 transparent WebP frames per colour in `public/spin/<colour>/<480|720|960>/<nnn>.webp`, made from 1529×2048 renders (quality 80, lossless alpha; lossy alpha made the outlines jagged). `HoodieSpin` loads one size (picked from the shown width) when the card nears the screen.

The footer shows the RootLand mark in 3D (`RootlandMark3D`, scene in `src/motion/markScene.ts`). three.js and `src/assets/rootland-mark-web.glb` load only when the footer nears the screen; keep `markScene` a dynamic import so three.js stays out of the entry bundle. The web GLB is the source `rootland-mark-no-plinth.glb` without UVs and with 16-bit KHR_mesh_quantization.

## Test gotchas
- **Tests must never touch Supabase, because it is production.** Every test file that imports a service mocks `../lib/supabase` with a client that throws on use, then spies on `DataService` statics and `StoreSettingsService.getSettingsSync`.
- `qaFixes.test.ts` asserts **exact source substrings** and image sizes. Refactoring or reformatting these files can fail it without any behavior change: `App.tsx`, `Footer.tsx`, `B2BPage.tsx`, `SizeGuideModal.tsx`, `HomePage.tsx`, `ProductCard.tsx`, `AuthModal.tsx`, `authService.ts`, `ResetPasswordPage.tsx` and the first migration. When you change an asserted string on purpose, update the test.
- `productService.test.ts` enforces honest copy. Products must say "70% Egyptian cotton, 30% polyester" and must never claim a GSM weight or 100% cotton.
