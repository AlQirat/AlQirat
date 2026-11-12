import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { newProducts } from "./new-products-data.mjs";

function loadEnv() {
  const file = path.resolve(".env");
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs.readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((line) => {
        const index = line.indexOf("=");
        return index > 0 ? [line.slice(0, index).trim(), line.slice(index + 1).trim()] : null;
      })
      .filter(Boolean),
  );
}

const env = loadEnv();
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const expectedSlugs = new Set(newProducts.map((product) => product.slug));
if (expectedSlugs.size !== 36) {
  throw new Error(`Expected 36 new product slugs, found ${expectedSlugs.size}. Refusing to continue.`);
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: products, error: productsError } = await supabase
  .from("products")
  .select("id,slug,name,image_url")
  .order("slug");
if (productsError) throw productsError;

const protectedProducts = products.filter((product) => expectedSlugs.has(product.slug));
const missingSlugs = [...expectedSlugs].filter((slug) => !protectedProducts.some((product) => product.slug === slug));
const invalidImages = protectedProducts.filter((product) => !product.image_url?.startsWith("/new-products/"));
if (missingSlugs.length || invalidImages.length) {
  throw new Error(
    [
      missingSlugs.length ? `Missing expected products: ${missingSlugs.join(", ")}` : "",
      invalidImages.length ? `Expected local images for: ${invalidImages.map((product) => product.slug).join(", ")}` : "",
    ].filter(Boolean).join(" "),
  );
}

const legacyProducts = products.filter((product) => !expectedSlugs.has(product.slug));
if (!legacyProducts.length) {
  console.log(`Catalog already contains only the ${expectedSlugs.size} new image-backed products.`);
  process.exit(0);
}
if (legacyProducts.length !== 11) {
  throw new Error(`Expected exactly 11 legacy products, found ${legacyProducts.length}. Refusing to continue.`);
}

const legacyIds = legacyProducts.map((product) => product.id);
const legacySlugs = legacyProducts.map((product) => product.slug);
console.log(`Legacy products identified (${legacyProducts.length}): ${legacySlugs.join(", ")}`);

async function countReferences(table) {
  const { count, error } = await supabase
    .from(table)
    .select("product_id", { count: "exact", head: true })
    .in("product_id", legacyIds);
  if (error) throw error;
  return count || 0;
}

const references = {
  cartItems: await countReferences("cart_items"),
  cartComboItems: await countReferences("cart_combo_items"),
  orderItems: await countReferences("order_items"),
  reviews: await countReferences("reviews"),
  comboOffers: await countReferences("combo_offer_products"),
};
console.log(`References: ${JSON.stringify(references)}`);

if (!process.argv.includes("--confirm")) {
  console.log("Dry run only. Re-run with --confirm to delete these legacy products.");
  process.exit(0);
}

if (references.cartComboItems) {
  const { error } = await supabase.from("cart_combo_items").delete().in("product_id", legacyIds);
  if (error) throw error;
  console.log(`Removed ${references.cartComboItems} active combo-cart references before deletion.`);
}

const { error: deleteError } = await supabase.from("products").delete().in("id", legacyIds);
if (deleteError) throw deleteError;

const { data: remaining, error: verifyError } = await supabase
  .from("products")
  .select("slug")
  .order("slug");
if (verifyError) throw verifyError;
const remainingSlugs = new Set(remaining.map((product) => product.slug));
const unexpected = [...remainingSlugs].filter((slug) => !expectedSlugs.has(slug));
const stillMissing = [...expectedSlugs].filter((slug) => !remainingSlugs.has(slug));
if (remaining.length !== expectedSlugs.size || unexpected.length || stillMissing.length) {
  throw new Error(
    `Post-delete verification failed. Remaining: ${remaining.length}; unexpected: ${unexpected.join(", ")}; missing: ${stillMissing.join(", ")}`,
  );
}

console.log(`Deleted ${legacyProducts.length} legacy products. ${remaining.length} new products remain.`);
console.log("Order item references were preserved by the database foreign-key policy; their product links are set to null.");
