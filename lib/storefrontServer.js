import { createAdminCatalogClient } from "@/lib/adminCatalog";
import { isCatalogDatabaseConfigured } from "@/lib/supabase/config";

const emptyCatalog = { categories: [], products: [] };
const emptyContent = { hero_slides: [], announcements: [], delivery_settings: null, faqs: [], combo_offer: null };

const comboOfferFields = "id,slug,name,title,subtitle,description,banner_image_url,mobile_banner_image_url,cta_label,cta_href,default_unit_price,combo_price,bundle_quantity,min_quantity,max_quantity,max_quantity_per_product,allow_same_product,allow_mixed_products,showcase_badge,showcase_heading,showcase_description,is_active";

function mapComboOffer(offer, products = []) {
  if (!offer) return null;
  return {
    ...offer,
    default_unit_price: Number(offer.default_unit_price),
    combo_price: Number(offer.combo_price),
    showcase_badge: offer.showcase_badge || "Combo Set",
    showcase_heading: offer.showcase_heading || offer.title || "Build Your Own Combo",
    showcase_description: offer.showcase_description || offer.subtitle || "Pick any bottles of your choice at a special combo price.",
    products: products.map((item) => {
      const prod = item.products || item;
      const defaultUnitPrice = Number(offer.default_unit_price ?? 180);
      const unitPrice = Number(item.unit_price ?? defaultUnitPrice ?? prod.price ?? 0);
      const isExclusive = prod.show_in_shop === false;
      const comparePrice = isExclusive && prod.compare_at_price !== null && prod.compare_at_price !== undefined
        ? Number(prod.compare_at_price)
        : null;
      return {
        id: item.product_id || prod.id,
        product_id: item.product_id || prod.id,
        name: prod.name || item.name,
        slug: prod.slug || item.slug,
        short_description: prod.short_description || item.short_description,
        description: prod.description || prod.short_description || "",
        image_url: prod.image_url || item.image_url,
        gallery_urls: Array.isArray(prod.gallery_urls) ? prod.gallery_urls : [],
        fragrance_notes: prod.fragrance_notes || null,
        badge: prod.badge || null,
        variant_label: item.variant_label || prod.variant_label || "Standard",
        show_in_shop: !isExclusive,
        price: unitPrice,
        catalog_price: Number(prod.price ?? unitPrice),
        compare_at_price: null,
        stock_quantity: Number(prod.stock_quantity ?? item.stock_quantity ?? 0),
        unit_price: unitPrice,
        sort_order: item.sort_order,
      };
    }),
  };
}

// Public catalog: active categories and products. Used by the API route and by server-rendered pages,
// so the first paint already has real data instead of waiting for a client-side fetch.
// `collection` ("special-edition" | "gift-set" | "attar") returns only that collection's products.
// Without it, the full shop catalog is returned: regular perfumes plus every collection product.
// Only combo-exclusive products (show_in_shop = false) are left out.
export async function fetchStorefrontCatalog(collection = null) {
  if (!isCatalogDatabaseConfigured()) return emptyCatalog;
  const supabase = createAdminCatalogClient();
  const inCollection = (query) => (collection ? query.eq("collection", collection) : query);
  // Collection products have no categories; the shop loads its categories as before.
  const [{ data: categories, error: categoryError }, { data: products, error: productError }] = await Promise.all([
    collection
      ? Promise.resolve({ data: [], error: null })
      : supabase.from("categories").select("id,name,slug,description,image_url,redirect_url,sort_order,subcategories(id,name,slug,sort_order,is_active)").eq("is_active", true).order("sort_order"),
    inCollection(supabase.from("products").select("id,name,slug,collection,short_description,description,price,compare_at_price,stock_quantity,image_url,gallery_urls,variants,fragrance_notes,badge,rating,review_count,is_featured,category_id,subcategory_id,categories(name,slug),subcategories(name,slug)").eq("is_active", true).neq("show_in_shop", false)).order("created_at"),
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
    .select("product_id,unit_price,variant_label,sort_order,products(id,name,slug,short_description,description,price,compare_at_price,stock_quantity,image_url,gallery_urls,fragrance_notes,badge,variant_label,show_in_shop,is_active)")
    .eq("offer_id", offer.id)
    .eq("is_active", true)
    .order("sort_order");
  if (productsError) throw new Error(productsError.message);
  return mapComboOffer(offer, products.filter((item) => item.products?.is_active));
}

export async function fetchStorefrontProductBySlug(slug) {
  if (!isCatalogDatabaseConfigured() || !slug) return null;
  const supabase = createAdminCatalogClient();
  const { data, error } = await supabase
    .from("products")
    .select("id,name,slug,collection,short_description,description,price,compare_at_price,stock_quantity,image_url,gallery_urls,variants,fragrance_notes,badge,variant_label,show_in_shop,rating,review_count,is_featured,category_id,subcategory_id,categories(name,slug),subcategories(name,slug)")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// For pages: a database hiccup should not take the whole page down, so log it and render empty.
export async function loadCatalogForPage(collection = null) {
  try {
    return await fetchStorefrontCatalog(collection);
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
