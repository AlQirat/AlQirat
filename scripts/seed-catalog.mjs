// Enters the starter Al Qirat catalog into Supabase and uploads its photos to ImageKit.
// Usage: npm run db:seed
//
// Safe to re-run: categories, subcategories and products are only added when their slug is missing,
// so edits made in the admin dashboard are never overwritten. Prices, stock and descriptions below
// are starter values to be reviewed and edited from /admin.
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const file = path.resolve(".env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].trim();
  }
}

loadEnv();
const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, IMAGEKIT_PRIVATE_KEY } = process.env;
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !IMAGEKIT_PRIVATE_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and IMAGEKIT_PRIVATE_KEY in .env first.");
  process.exit(1);
}

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const slugify = (value) => value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const uploads = new Map();
async function uploadToImageKit(localPath, folder) {
  if (uploads.has(localPath)) return uploads.get(localPath);
  const body = new FormData();
  body.append("file", new Blob([fs.readFileSync(path.resolve(localPath))]), path.basename(localPath));
  body.append("fileName", path.basename(localPath));
  body.append("folder", folder);
  body.append("useUniqueFileName", "false");
  body.append("overwriteFile", "true");
  body.append("tags", "al-qirat,seed");
  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${IMAGEKIT_PRIVATE_KEY}:`).toString("base64")}` },
    body,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`ImageKit upload of ${localPath} failed: ${result.message || response.status}`);
  uploads.set(localPath, result.url);
  return result.url;
}

const categories = [
  { name: "Perfumes", description: "Modern Scents for Every Personality", image: "public/images/home/category-perfumes.jpg", subcategories: ["Extrait de Parfum"] },
  { name: "Attars", description: "Pure, Traditional & Long Lasting", image: "public/images/home/category-attars.jpg", subcategories: ["Traditional"] },
  { name: "Gift Sets", description: "Perfect for Every Occasion", image: "public/images/home/category-gift-sets.jpg", subcategories: ["Gift Box"] },
  { name: "Special Editions", description: "Exclusive Scents for True Connoisseurs", image: "public/images/home/category-special-editions.jpg", subcategories: ["Collection"] },
];

const img = (name) => `public/products/al-qirat/${name}.jpg`;
const products = [
  { name: "Lavish Ice", category: "Perfumes", sub: "Extrait de Parfum", short: "Extrait de Parfum", price: 1499, badge: "Best Seller", featured: true, image: img("lavish-ice"),
    description: "A fresh, cooling extrait de parfum from the Al Qirat collection. Imported luxury with long-lasting wear and a clean, modern character." },
  { name: "Oud Al Qirat", category: "Perfumes", sub: "Extrait de Parfum", short: "Extrait de Parfum", price: 1299, featured: true, image: img("oud-al-qirat"),
    description: "Our signature oud, presented in a black and gold bottle. A deep, rich extrait de parfum made to leave a lasting impression." },
  { name: "Sandal Royale", category: "Perfumes", sub: "Extrait de Parfum", short: "Extrait de Parfum", price: 1199, featured: true, image: img("sandal-royale"),
    description: "A warm amber extrait de parfum with a royal, woody character. Smooth, long lasting and made for evenings and special occasions." },
  { name: "Midnight Oud", category: "Perfumes", sub: "Extrait de Parfum", short: "Extrait de Parfum", price: 999, featured: true, image: img("midnight-oud"),
    description: "A deep blue extrait de parfum with an oud heart. Bold, refined and long lasting." },
  { name: "Royal Gold Attar", category: "Attars", sub: "Traditional", short: "Traditional Attar", price: 899, badge: "New", image: img("gold-attar"),
    description: "A traditional concentrated perfume oil in a hand-finished gold bottle. Pure, long lasting and made to be worn close to the skin." },
  { name: "Royal Oud Gift Set", category: "Gift Sets", sub: "Gift Box", short: "Perfume + attar roll-on", price: 2499, badge: "Gift Pick", image: img("royal-oud-gift-set"),
    description: "A boxed Royal Oud perfume with a matching roll-on attar, presented in a velvet-lined gift case with ribbon." },
  { name: "Ocean Musk Gift Set", category: "Gift Sets", sub: "Gift Box", short: "Perfume, attar & pouch", price: 2299, image: img("ocean-musk-gift-set"),
    description: "Ocean Musk perfume with a roll-on attar and a velvet pouch, packed in an emerald gift box." },
  { name: "Sultan Attar Gift Set", category: "Gift Sets", sub: "Gift Box", short: "Premium attar set", price: 2799, image: img("sultan-attar-gift-set"),
    description: "A premium attar set with a roll-on and velvet pouch, presented in a green and gold gift box with a tag." },
  { name: "Blue Oud Gift Set", category: "Gift Sets", sub: "Gift Box", short: "Premium attar set", price: 2599, image: img("blue-oud-gift-set"),
    description: "Blue Oud attar with a matching roll-on and pouch, in a navy and gold gift box." },
  { name: "Signature Gift Box", category: "Gift Sets", sub: "Gift Box", short: "Ready-to-gift box", price: 1999, image: img("signature-gift-box"),
    description: "A ready-to-gift Al Qirat box wrapped with a gold ribbon. Add your choice of fragrance." },
  { name: "Signature Collection", category: "Special Editions", sub: "Collection", short: "Five-fragrance range", price: 5999, badge: "Limited", image: img("signature-collection"),
    description: "The Al Qirat signature range: Lavish Ice, Royal Musk, Rose Noir, Amber Oud and Oud Intense. Exclusive scents for true connoisseurs." },
];

function check(result, what) {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data;
}

async function main() {
  const categoryIds = new Map();
  const subcategoryIds = new Map();

  for (const [index, category] of categories.entries()) {
    const slug = slugify(category.name);
    let row = check(await supabase.from("categories").select("id").eq("slug", slug).maybeSingle(), `read category ${slug}`);
    if (row) {
      console.log(`skip   category ${category.name} (exists)`);
    } else {
      const image_url = await uploadToImageKit(category.image, "/al-qirat/categories");
      row = check(await supabase.from("categories").insert({ name: category.name, slug, description: category.description, image_url, sort_order: index + 1 }).select("id").single(), `add category ${slug}`);
      console.log(`add    category ${category.name}`);
    }
    categoryIds.set(category.name, row.id);

    for (const [subIndex, subName] of category.subcategories.entries()) {
      const subSlug = slugify(subName);
      let sub = check(await supabase.from("subcategories").select("id").eq("category_id", row.id).eq("slug", subSlug).maybeSingle(), `read subcategory ${subSlug}`);
      if (!sub) {
        sub = check(await supabase.from("subcategories").insert({ category_id: row.id, name: subName, slug: subSlug, sort_order: subIndex + 1 }).select("id").single(), `add subcategory ${subSlug}`);
      }
      subcategoryIds.set(`${category.name}/${subName}`, sub.id);
    }
  }

  for (const product of products) {
    const slug = slugify(product.name);
    const existing = check(await supabase.from("products").select("id").eq("slug", slug).maybeSingle(), `read product ${slug}`);
    if (existing) {
      console.log(`skip   product ${product.name} (exists)`);
      continue;
    }
    const image_url = await uploadToImageKit(product.image, "/al-qirat/products");
    check(await supabase.from("products").insert({
      category_id: categoryIds.get(product.category),
      subcategory_id: subcategoryIds.get(`${product.category}/${product.sub}`),
      name: product.name,
      slug,
      short_description: product.short,
      description: product.description,
      price: product.price,
      stock_quantity: 50,
      image_url,
      badge: product.badge || null,
      is_featured: Boolean(product.featured),
      is_active: true,
    }), `add product ${slug}`);
    console.log(`add    product ${product.name}`);
  }

  // The default hero slide (migration 011/017) points at files in /public; move its images to ImageKit.
  const slide = check(await supabase.from("hero_slides").select("id,desktop_image_url,mobile_image_url").eq("id", "50000000-0000-4000-8000-000000000001").maybeSingle(), "read hero slide");
  if (slide && slide.desktop_image_url.startsWith("/")) {
    const desktop = await uploadToImageKit("public/images/home/hero.jpg", "/al-qirat/hero-slides");
    const mobile = await uploadToImageKit("public/images/home/hero-mobile.jpg", "/al-qirat/hero-slides");
    check(await supabase.from("hero_slides").update({ desktop_image_url: desktop, mobile_image_url: mobile }).eq("id", slide.id), "update hero slide");
    console.log("update hero slide images -> ImageKit");
  }
}

main().catch((error) => {
  console.error(`FAILED: ${error.message}`);
  process.exit(1);
});
