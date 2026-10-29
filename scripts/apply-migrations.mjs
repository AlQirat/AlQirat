// Applies the schema migrations in supabase/migrations to the database in .env, once each.
// Usage: npm run db:migrate            (applies the default schema set)
//        npm run db:migrate -- 007_seed_product_catalog.sql   (applies specific files)
//
// The Sidra-era catalog/demo seeds (005, 007-010, 014-016) are intentionally NOT in the default set.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const defaultMigrations = [
  "001_admin_authorization.sql",
  "002_catalog.sql",
  "003_commerce.sql",
  "004_storefront_content.sql",
  "006_customer_checkout.sql",
  "011_storefront_sync_and_checkout_integrity.sql",
  "012_add_product_variants.sql",
  "013_product_media_reviews_and_cod.sql",
  "017_al_qirat_storefront_defaults.sql",
  "018_newsletter_subscribers.sql",
  "20261025_custom_perfume_requests.sql",
  "20261025_custom_perfume_order_checkout.sql",
  "20261028_razorpay_checkout.sql",
  "20261028_shiprocket_fulfillment.sql",
  "20261028_cod_availability.sql",
  "20261028_auth_rate_limiting.sql",
  "20261028_auth_rate_limiting_function_fix.sql",
  "20261028_auth_rate_limiting_function_fix2.sql",
  "20261029_combo_hero_slide.sql",
  "20261029_combo_offers.sql",
  "20261029_combo_offer_any_quantity.sql",
];

function loadEnv() {
  const file = path.resolve(".env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].trim();
  }
}

loadEnv();
const connectionString = process.env.DATABASE_URL || process.env.Direct_connection_str;
if (!connectionString) {
  console.error("Set DATABASE_URL (or Direct_connection_str) in .env to your Supabase Postgres connection string.");
  process.exit(1);
}

const requested = process.argv.slice(2);
const files = requested.length ? requested : defaultMigrations;
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

await client.connect();
try {
  await client.query("create table if not exists public.schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  // Keep the bookkeeping table out of the public REST API: RLS on with no policies = no access.
  await client.query("alter table public.schema_migrations enable row level security");
  const applied = new Set((await client.query("select name from public.schema_migrations")).rows.map((row) => row.name));

  for (const name of files) {
    if (applied.has(name)) {
      console.log(`skip   ${name} (already applied)`);
      continue;
    }
    const sql = fs.readFileSync(path.resolve("supabase/migrations", name), "utf8");
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into public.schema_migrations (name) values ($1)", [name]);
      await client.query("commit");
      console.log(`apply  ${name}`);
    } catch (error) {
      await client.query("rollback");
      console.error(`FAILED ${name}: ${error.message}`);
      process.exitCode = 1;
      break;
    }
  }
} finally {
  await client.end();
}
