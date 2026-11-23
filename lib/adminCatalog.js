import { createClient } from "@supabase/supabase-js";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "./adminAuth";

export function isAuthorizedAdminRequest(request) {
  return verifyAdminSessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export function createAdminCatalogClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase admin catalog access is not configured.");

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

export function createSlug(value) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Product slugs are globally unique (they are used in URLs and cart lookups), but the same
// product name may exist in different categories, or in a collection (Special Edition / Gift Set) and the shop.
// The first product keeps the plain name slug; a same-named product elsewhere gets "<name>-<category>"
// (shop) or "<name>-<collection>" (collection), then -2, -3 ... if needed.
// On edit, a product keeps its current slug when it is still one of the valid candidates.
export async function resolveProductSlug(supabase, { name, categoryId = null, excludeId = null, collection = null }) {
  const baseSlug = createSlug(name);
  if (!baseSlug) return "";

  // Collection products have no category; shop products must use a shop category (never a collection's).
  let suffix = collection;
  if (!collection) {
    const { data: category, error: categoryError } = await supabase.from("categories").select("slug,collection").eq("id", categoryId).maybeSingle();
    if (categoryError) throw new Error("Unable to verify the product category.");
    if (!category) throw new Error("Selected category does not exist.");
    if (category.collection) throw new Error("Selected category does not belong to the shop catalog.");
    suffix = category.slug;
  }

  // The same name may not repeat within one category (shop) or within one collection.
  let sameName = supabase.from("products").select("id").ilike("name", name.trim().replace(/[\\%_]/g, "\\$&")).limit(1);
  sameName = collection ? sameName.eq("collection", collection) : sameName.is("collection", null).eq("category_id", categoryId);
  if (excludeId) sameName = sameName.neq("id", excludeId);
  const { data: duplicates, error: duplicateError } = await sameName;
  if (duplicateError) throw new Error("Unable to verify the product name.");
  if (duplicates?.length) throw new Error(`A product with this name already exists ${collection ? "in this section" : "in this category"}. Please enter a different product name.`);

  const withCategory = `${baseSlug}-${suffix}`;
  const { data: rows, error } = await supabase.from("products").select("id,slug").like("slug", `${baseSlug}%`);
  if (error) throw new Error("Unable to verify the product name.");

  const taken = new Set((rows || []).filter((row) => row.id !== excludeId).map((row) => row.slug));
  const own = excludeId ? (rows || []).find((row) => row.id === excludeId)?.slug : null;

  if (own && (own === baseSlug || own === withCategory || own.startsWith(`${withCategory}-`)) && !taken.has(own)) return own;
  if (!taken.has(baseSlug)) return baseSlug;
  if (!taken.has(withCategory)) return withCategory;
  for (let i = 2; i < 100; i += 1) {
    const candidate = `${withCategory}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error("A product with this name already exists. Please enter a different product name.");
}
