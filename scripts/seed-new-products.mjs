import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { lavishIceGalleryImage, newProducts } from "./new-products-data.mjs";

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

for (const product of newProducts) {
  if (!fs.existsSync(path.resolve(`public${product.image}`))) throw new Error(`Missing product image: ${product.image}`);
  if (product.compare_at_price <= product.price) throw new Error(`MRP must exceed selling price: ${product.name}`);
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: categories, error: categoryError } = await supabase
  .from("categories")
  .select("id,slug,subcategories(id,slug)");
if (categoryError) throw categoryError;

const category = categories.find((item) => item.slug === "perfumes");
const subcategory = category?.subcategories.find((item) => item.slug === "extrait-de-parfum");
if (!category || !subcategory) throw new Error("Perfumes / Extrait de Parfum category is missing.");

const { data: existing, error: existingError } = await supabase
  .from("products")
  .select("id,slug,price,compare_at_price,gallery_urls");
if (existingError) throw existingError;

const existingSlugs = new Set(existing.map((product) => product.slug));
const rows = newProducts
  .filter((product) => !existingSlugs.has(product.slug))
  .map((product) => ({
    category_id: category.id,
    subcategory_id: subcategory.id,
    name: product.name,
    slug: product.slug,
    short_description: product.short_description,
    description: product.description,
    price: product.price,
    compare_at_price: product.compare_at_price,
    stock_quantity: 50,
    image_url: product.image,
    gallery_urls: [],
    variants: [],
    badge: "New",
    is_active: true,
    is_featured: false,
  }));

if (rows.length) {
  const { error } = await supabase.from("products").insert(rows);
  if (error) throw error;
}

const lavishIce = existing.find((product) => product.slug === "lavish-ice");
if (lavishIce && !lavishIce.gallery_urls?.includes(lavishIceGalleryImage)) {
  const galleryUrls = [...new Set([...(lavishIce.gallery_urls || []), lavishIceGalleryImage])];
  const { error } = await supabase.from("products").update({ gallery_urls: galleryUrls }).eq("id", lavishIce.id);
  if (error) throw error;
}

const existingMrps = {
  "lavish-ice": 1499,
  "oud-al-qirat": 1799,
  "sandal-royale": 1599,
  "midnight-oud": 1399,
  "royal-gold-attar": 1199,
  "royal-oud-gift-set": 2999,
  "ocean-musk-gift-set": 2799,
  "sultan-attar-gift-set": 3499,
  "blue-oud-gift-set": 3299,
  "signature-gift-box": 2499,
  "signature-collection": 7499,
};

for (const product of existing) {
  const mrp = existingMrps[product.slug];
  if (mrp && product.compare_at_price === null) {
    const { error } = await supabase.from("products").update({ compare_at_price: mrp }).eq("id", product.id);
    if (error) throw error;
  }
}

console.log(`Inserted ${rows.length} new products and refreshed Lavish Ice gallery/MRP metadata.`);
