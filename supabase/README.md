# Al Qirat Perfumes — Supabase

The database is the single source of truth for categories, products, hero slides, announcements, FAQs,
delivery settings, orders, customers, reviews, inquiries and newsletter subscribers. Everything is
managed from the admin dashboard at `/admin`.

## Setting up a database

```
npm run db:migrate   # create the tables, security rules and checkout functions
npm run db:seed      # optional: enter the starter Al Qirat categories and products
```

Both read `.env`. `db:migrate` uses `Direct_connection_str` (or `DATABASE_URL`) and applies each file in
`migrations/` once, tracked in `public.schema_migrations`. `db:seed` uses the Supabase service-role key and
the ImageKit private key: it uploads the starter photos to ImageKit and adds categories and products only
when their slug is missing, so it never overwrites edits made in the admin.

Migrations: `001` admin authorisation, `002` catalog, `003` commerce, `004` storefront content,
`006` customer checkout, `011` storefront defaults and checkout integrity, `012` product variants,
`013` galleries / reviews / COD, `017` Al Qirat defaults, `018` newsletter subscribers, `20261025_custom_perfume_requests`,
and `20261025_custom_perfume_order_checkout`.

## Supabase Auth settings (set in the Supabase dashboard)

Customer sign-up, email confirmation and password reset need your site URL:

- Authentication > URL Configuration > **Site URL**: your production URL (e.g. the Vercel domain).
- **Redirect URLs**: `https://<your-domain>/auth/confirm` and `http://localhost:3000/auth/confirm`.

## Admin dashboard

`/admin` signs in with the server-only `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables. Product,
category and hero images are uploaded from the browser straight to ImageKit using a short-lived signature
from `/api/admin/imagekit-auth`.

Never put service-role credentials, admin passwords or real user identifiers in these SQL files.

## Signature scent requests

Apply `npm run db:migrate -- 20261025_custom_perfume_requests.sql` to an existing installation,
or use the default migration command for a new database. The migration requires the existing
`set_updated_at()` function and Supabase Auth. Both availability switches start enabled.
It is safe to paste the migration into Supabase SQL Editor more than once. If
`schema_migrations` already contains this filename, the project migration runner skips it because
the feature is already installed; the SQL Editor version is guarded so an existing installation
does not fail with `relation already exists`.

Customers sign in at `/custom-perfume` and track quotations and status history in
`/account#custom-perfume-requests`. Admins manage availability, status, quotations in INR, and
private notes at `/admin?section=custom-perfume`. Hiding the homepage section does not disable
submissions; disabling the feature blocks new submissions at the database boundary. Existing
requests remain readable. Updates refresh every ten seconds, on window focus, and after
admin changes in another tab. No Realtime publication or email provider is required.
Notifications are persistent account updates, not outgoing emails.

Once an admin publishes a quotation, the customer can accept it from the account page by entering or
confirming a delivery address. Acceptance calls the authenticated `accept_custom_perfume_quote` RPC,
which creates one normal COD order and order item linked by `orders.custom_perfume_request_id`, then
moves the request to `in_progress`. The customer sees it in the normal order history, and admins see it
in Orders with a Custom scent label. Submitting an enquiry or publishing a quotation alone never creates
an order or collects payment. The RPC is ownership-checked, idempotent, and does not use service-role
credentials in the browser.

Customer insert grants allow only submission fields and the retry identifier. Ownership is
derived from `auth.uid()`; customers cannot update statuses, quotations, notes, or settings.
Internal notes have a separate table with no customer grants or policies. The admin update
RPC is service-role-only and uses a version check to prevent lost updates.

Verification:

- `npm run test:custom-perfume`: validation rules, no external services.
- `npm run test:custom-perfume:db`: real database permissions and transaction behavior; all
  fixtures and settings changes are rolled back.
- `npx playwright install chromium`, then `npm run test:custom-perfume:e2e`: real browser
  and Supabase flow. Start the application on port 3100 or set `SCENT_TEST_BASE_URL`.
  Requires the existing Supabase service key and admin credentials. It creates temporary
  test users, restores availability settings, and deletes its fixtures afterward. Run on a
  test environment because availability is briefly changed while checking the switches.
- `npm run build`: production compilation. Use a separate `NEXT_DIST_DIR` if a development
  server is running to avoid sharing build artifacts.
