import { createAdminCatalogClient } from "@/lib/adminCatalog";
import { isCatalogDatabaseConfigured } from "@/lib/supabase/config";

const emptyCatalog = { categories: [], products: [] };
const emptyContent = { hero_slides: [], announcements: [], delivery_settings: null, faqs: [] };

// Public catalog: active categories and products. Used by the API route and by server-rendered pages,
// so the first paint already has real data instead of waiting for a client-side fetch.
export async function fetchStorefrontCatalog() {
  if (!isCatalogDatabaseConfigured()) return emptyCatalog;
  const supabase = createAdminCatalogClient();
  const [{ data: categories, error: categoryError }, { data: products, error: productError }] = await Promise.all([
    supabase.from("categories").select("id,name,slug,description,image_url,sort_order,subcategories(id,name,slug,sort_order,is_active)").eq("is_active", true).order("sort_order"),
    supabase.from("products").select("id,name,slug,short_description,description,price,stock_quantity,image_url,gallery_urls,variants,badge,rating,review_count,is_featured,category_id,subcategory_id,categories(name,slug),subcategories(name,slug)").eq("is_active", true).order("created_at"),
  ]);
  const error = categoryError || productError;
  if (error) throw new Error(error.message);
  const uniqueCategories = [...new Map(categories.map((category) => [category.name.trim().toLowerCase(), category])).values()];
  return { categories: uniqueCategories, products };
}

export async function fetchStorefrontContent() {
  if (!isCatalogDatabaseConfigured()) return emptyContent;
  const supabase = createAdminCatalogClient();
  const [slides, announcements, settings, faqs] = await Promise.all([
    supabase.from("hero_slides").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("announcements").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("delivery_settings").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("faqs").select("*").eq("is_active", true).order("sort_order"),
  ]);
  const failure = [slides, announcements, settings, faqs].find((result) => result.error);
  if (failure) throw new Error(failure.error.message);
  return { hero_slides: slides.data, announcements: announcements.data, delivery_settings: settings.data, faqs: faqs.data };
}

// For pages: a database hiccup should not take the whole page down, so log it and render empty.
export async function loadCatalogForPage() {
  try {
    return await fetchStorefrontCatalog();
  } catch (error) {
    console.error("Unable to load the catalog:", error.message);
    return emptyCatalog;
  }
}

export async function loadContentForPage() {
  try {
    return await fetchStorefrontContent();
  } catch (error) {
    console.error("Unable to load storefront content:", error.message);
    return emptyContent;
  }
}
