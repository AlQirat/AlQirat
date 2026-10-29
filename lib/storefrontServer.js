import { createAdminCatalogClient } from "@/lib/adminCatalog";
import { isCatalogDatabaseConfigured } from "@/lib/supabase/config";

const emptyCatalog = { categories: [], products: [] };
const emptyContent = { hero_slides: [], announcements: [], delivery_settings: null, faqs: [], combo_offer: null };

const comboOfferFields = "id,slug,name,title,subtitle,description,banner_image_url,mobile_banner_image_url,cta_label,cta_href,default_unit_price,combo_price,bundle_quantity,min_quantity,max_quantity,max_quantity_per_product,allow_same_product,allow_mixed_products,is_active";

function mapComboOffer(offer, products = []) {
  if (!offer) return null;
  return {
    ...offer,
    default_unit_price: Number(offer.default_unit_price),
    combo_price: Number(offer.combo_price),
    products: products.map((item) => ({
      id: item.product_id || item.products?.id,
      product_id: item.product_id || item.products?.id,
      name: item.products?.name || item.name,
      slug: item.products?.slug || item.slug,
      short_description: item.products?.short_description || item.short_description,
      image_url: item.products?.image_url || item.image_url,
      price: Number(item.products?.price ?? item.price ?? 0),
      stock_quantity: Number(item.products?.stock_quantity ?? item.stock_quantity ?? 0),
      unit_price: Number(item.unit_price),
      sort_order: item.sort_order,
    })),
  };
}

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
  const [slides, announcements, settings, faqs, comboOffer] = await Promise.all([
    supabase.from("hero_slides").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("announcements").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("delivery_settings").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("faqs").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("combo_offers").select(comboOfferFields).eq("slug", "choose-any-3").maybeSingle(),
  ]);
  const failure = [slides, announcements, settings, faqs, comboOffer].find((result) => result.error);
  if (failure) throw new Error(failure.error.message);
  return { hero_slides: slides.data, announcements: announcements.data, delivery_settings: settings.data, faqs: faqs.data, combo_offer: comboOffer.data };
}

export async function fetchStorefrontComboOffer() {
  if (!isCatalogDatabaseConfigured()) return null;
  const supabase = createAdminCatalogClient();
  const { data: offer, error: offerError } = await supabase
    .from("combo_offers")
    .select(comboOfferFields)
    .eq("slug", "choose-any-3")
    .maybeSingle();
  if (offerError) throw new Error(offerError.message);
  if (!offer) return null;

  const { data: products, error: productsError } = await supabase
    .from("combo_offer_products")
    .select("product_id,unit_price,sort_order,products(id,name,slug,short_description,price,stock_quantity,image_url,is_active)")
    .eq("offer_id", offer.id)
    .eq("is_active", true)
    .order("sort_order");
  if (productsError) throw new Error(productsError.message);
  return mapComboOffer(offer, products.filter((item) => item.products?.is_active));
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
