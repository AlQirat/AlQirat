# AGENTS.md

Next.js 14 App Router storefront + admin for Al Qirat Perfumes. JavaScript/JSX only (no TypeScript); `@/*` maps to the repo root (`jsconfig.json`). Supabase Postgres/Auth is the source of truth; Tailwind for styling.

## Commands

Run from the repo root:

```powershell
npm run dev
npm run build
npm run start
npm run db:migrate                  # default migration set
npm run db:migrate -- 20261025_custom_perfume_requests.sql
npm run db:seed
npm run test:custom-perfume         # pure validation tests, no network/env needed
npm run test:custom-perfume:db      # real DB, all fixtures rolled back
npx playwright install chromium
npm run test:custom-perfume:e2e
```

- No lint, typecheck, or formatter is configured. `npm run build` is the closest full verification.
- `npm run db:migrate` uses `DATABASE_URL` or `Direct_connection_str` from `.env`; `db:seed` additionally needs the Supabase service-role and ImageKit private keys. Both scripts parse `.env` themselves (no dotenv in the migrate/seed path).
- Applied migrations are tracked in `public.schema_migrations`. Editing an already-applied migration does not rerun it; add a new file instead.
- New migrations are NOT picked up automatically: add the filename to `defaultMigrations` in `scripts/apply-migrations.mjs`.
- `next.config.mjs` honors `NEXT_DIST_DIR`; set it for builds while a dev server is running so artifacts are not clobbered.
- E2E expects the app at `http://localhost:3100` or `SCENT_TEST_BASE_URL`, needs real Supabase service-role/admin credentials, and briefly flips custom-perfume availability settings. Use a test project.

## Architecture and security

- Server pages load catalog/content through `loadCatalogForPage` / `loadContentForPage` in `lib/storefrontServer.js` and pass initial data to client components. If Supabase env is absent, these return empty data rather than throwing. Client components then fetch `/api/storefront/*`; cross-tab refresh uses `lib/storefrontSync.js` (localStorage + BroadcastChannel).
- Two separate auth systems: `/admin` uses `ADMIN_EMAIL`/`ADMIN_PASSWORD` and a signed `al_qirat_admin_session` cookie (`lib/adminAuth.js`), not Supabase Auth. Customers use Supabase email OTP with Brevo delivery. `middleware.js` only refreshes the Supabase session; it does not protect `/admin`.
- Every `/api/admin/*` route except `login` and `logout` must call `isAuthorizedAdminRequest` first. Preserve that guard when adding routes.
- Server-side DB access uses the service-role client from `lib/adminCatalog.js`, which bypasses RLS. Never import it into `"use client"` code. RLS policies/grants in `supabase/migrations` are the real customer security boundary.
- Payments: Razorpay orders are created server-side, verified at `/api/payments/razorpay/verify`, and confirmed by the signed webhook at `/api/webhooks/razorpay`. COD is gated by `delivery_settings.cod_enabled` in the UI and at the DB boundary. Keep Razorpay, ImageKit, and service-role secrets server-side.
- Custom perfume flow: customer submits at `/custom-perfume`, admin quotes at `/admin?section=custom-perfume`, and accepting a quote calls a DB RPC that creates a COD order. Shared validation lives in `lib/customPerfume.mjs`.
- Admin image uploads go browser -> ImageKit using a short-lived signature from `/api/admin/imagekit-auth`. Render images with `components/SmartImage.jsx` so ImageKit transforms apply.
- Read `supabase/README.md` before changing schema, auth, checkout, or migration behavior; it is the only project documentation.

## Conventions

- Add `"use client"` only to components that use hooks/browser APIs; `app/**/page.jsx` are server components by default.
- Reuse existing Tailwind tokens (`gold`, `ink`, `forest`, `sage`, `cream`), fonts, and `SmartImage`; do not introduce a second design system.
- Use `@/...` imports rather than long relative paths across top-level directories.
- API routes return `{ error }` JSON with an appropriate HTTP status.
