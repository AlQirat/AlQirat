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
`013` galleries / reviews / COD, `017` Al Qirat defaults, `018` newsletter subscribers.

## Supabase Auth settings (set in the Supabase dashboard)

Customer sign-up, email confirmation and password reset need your site URL:

- Authentication > URL Configuration > **Site URL**: your production URL (e.g. the Vercel domain).
- **Redirect URLs**: `https://<your-domain>/auth/confirm` and `http://localhost:3000/auth/confirm`.

## Admin dashboard

`/admin` signs in with the server-only `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables. Product,
category and hero images are uploaded from the browser straight to ImageKit using a short-lived signature
from `/api/admin/imagekit-auth`.

Never put service-role credentials, admin passwords or real user identifiers in these SQL files.
