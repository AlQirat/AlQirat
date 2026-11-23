import { NextResponse } from "next/server";
import { createAdminCatalogClient, createSlug, isAuthorizedAdminRequest } from "@/lib/adminCatalog";
import { heroSlideFieldsFromComboOffer } from "@/lib/heroSlides";
import { normalizeFragranceNotes } from "@/lib/fragranceNotes";

function unauthorized() {
  return NextResponse.json({ error: "Administrator authentication is required." }, { status: 401 });
}

async function ensureOfferRecord(supabase) {
  const { data: existing, error } = await supabase
    .from("combo_offers")
    .select("*")
    .eq("slug", "choose-any-3")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (existing) return existing;

  const { data: created, error: createError } = await supabase
    .from("combo_offers")
    .insert({
      slug: "choose-any-3",
      name: "Create Your Own Gift Set",
      title: "Create Your Own Combo Set",
      subtitle: "Pick any perfumes of your choice and unlock special combo pricing.",
      description: "Mix different fragrances or repeat a signature favourite.",
      banner_image_url: "/combo-banner-desktop.jpg",
      mobile_banner_image_url: "/combo-banner-mobile.jpg",
      cta_label: "Shop Combos",
      cta_href: "/combos",
      default_unit_price: 249,
      combo_price: 799,
      bundle_quantity: 4,
      min_quantity: 4,
      max_quantity: 40,
      max_quantity_per_product: 40,
      allow_same_product: true,
      allow_mixed_products: true,
      showcase_badge: "Combo Set",
      showcase_heading: "Build Your Own Combo",
      showcase_description: "Pick any bottles of your choice at a special combo price.",
      is_active: true,
    })
    .select("*")
    .single();
  if (createError) throw new Error(createError.message);
  return created;
}

async function readOffer() {
  const supabase = createAdminCatalogClient();
  const offer = await ensureOfferRecord(supabase);
  const [{ data: products, error: productsError }, { data: mappings, error: mappingsError }] = await Promise.all([
    supabase
      .from("products")
      .select("id,name,slug,short_description,description,price,compare_at_price,stock_quantity,image_url,gallery_urls,fragrance_notes,badge,variant_label,show_in_shop,is_active,created_at")
      .is("collection", null)
      .order("created_at"),
    supabase
      .from("combo_offer_products")
      .select("offer_id,product_id,unit_price,variant_label,sort_order,is_active")
      .eq("offer_id", offer.id)
      .order("sort_order"),
  ]);
  const error = productsError || mappingsError;
  if (error) throw new Error(error.message);

  const mappingByProduct = new Map((mappings || []).map((item) => [item.product_id, item]));
  const enrichedProducts = (products || [])
    .filter((product) => product.is_active || mappingByProduct.has(product.id))
    .map((product) => {
      const mapping = mappingByProduct.get(product.id);
      const isShopCatalog = product.show_in_shop !== false;
      return {
        ...product,
        show_in_shop: isShopCatalog,
        combo_unit_price: Number(mapping?.unit_price ?? offer.default_unit_price ?? product.price ?? 0),
        combo_variant_label: mapping?.variant_label || product.variant_label || "",
        combo_sort_order: mapping?.sort_order ?? 999,
        combo_active: Boolean(mapping?.is_active),
      };
    })
    .sort((a, b) => {
      if (a.combo_active !== b.combo_active) return a.combo_active ? -1 : 1;
      if (a.combo_sort_order !== b.combo_sort_order) return a.combo_sort_order - b.combo_sort_order;
      return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    });

  return {
    offer,
    products: enrichedProducts,
  };
}

function numberField(value, label, integer = false) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || (integer && !Number.isInteger(number))) {
    throw new Error(`${label} must be a valid ${integer ? "whole number" : "number"}.`);
  }
  return number;
}

function offerPayload(input) {
  const defaultUnitPrice = numberField(input.default_unit_price ?? 180, "Default individual price");
  const comboPrice = numberField(input.combo_price, "Combo price");
  const bundleQuantity = numberField(input.bundle_quantity, "Bottles per combo set", true);
  const minQuantity = numberField(input.min_quantity ?? bundleQuantity, "Minimum quantity", true);
  const maxQuantity = numberField(input.max_quantity ?? Math.max(bundleQuantity * 10, 40), "Maximum quantity", true);
  const maxPerProduct = numberField(input.max_quantity_per_product ?? maxQuantity, "Maximum quantity per product", true);
  if (bundleQuantity < 2) throw new Error("Bottles per set must be at least 2.");
  if (!minQuantity || maxQuantity < minQuantity || maxQuantity < bundleQuantity || !maxPerProduct) {
    throw new Error("Quantity rules are invalid. Maximum quantity must be at least the bottles-per-set count.");
  }
  return {
    slug: "choose-any-3",
    name: String(input.name || input.title || "Combo Set").trim(),
    title: String(input.title || "").trim(),
    subtitle: String(input.subtitle || "").trim() || null,
    description: String(input.description || "").trim() || null,
    banner_image_url: String(input.banner_image_url || "").trim() || null,
    mobile_banner_image_url: String(input.mobile_banner_image_url || input.banner_image_url || "").trim() || null,
    cta_label: String(input.cta_label || "Checkout Combo").trim(),
    cta_href: String(input.cta_href || "/combos").trim(),
    default_unit_price: defaultUnitPrice,
    combo_price: comboPrice,
    bundle_quantity: bundleQuantity,
    min_quantity: minQuantity,
    max_quantity: maxQuantity,
    max_quantity_per_product: maxPerProduct,
    allow_same_product: input.allow_same_product !== false,
    allow_mixed_products: input.allow_mixed_products !== false,
    showcase_badge: String(input.showcase_badge || "Combo Set").trim(),
    showcase_heading: String(input.showcase_heading || input.title || "Build Your Own Combo").trim(),
    showcase_description: String(input.showcase_description || input.subtitle || "Pick any bottles of your choice at a special combo price.").trim(),
    is_active: input.is_active === true,
  };
}

export async function GET(request) {
  if (!isAuthorizedAdminRequest(request)) return unauthorized();
  try {
    return NextResponse.json(await readOffer());
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  if (!isAuthorizedAdminRequest(request)) return unauthorized();
  try {
    const body = await request.json();
    const offer = offerPayload(body.offer || {});
    if (!offer.title) throw new Error("Combo page title is required.");

    const supabase = createAdminCatalogClient();
    const existingOffer = await ensureOfferRecord(supabase);

    const requestedProducts = Array.isArray(body.products) ? body.products : null;
    if (requestedProducts !== null) {
      const uniqueProducts = [...new Map(requestedProducts.map((product) => [String(product.product_id), product])).values()];
      const { data: catalogProducts, error: catalogError } = uniqueProducts.length
        ? await supabase.from("products").select("id").in("id", uniqueProducts.map((product) => product.product_id)).eq("is_active", true)
        : { data: [], error: null };
      if (catalogError) throw new Error(catalogError.message);
      if (catalogProducts.length !== uniqueProducts.length) throw new Error("Every selected combo product must be active.");
      if (offer.is_active && uniqueProducts.length === 0) throw new Error("Add or enable at least one combo product before activating the page.");
      for (const product of uniqueProducts) numberField(product.unit_price, "Individual combo price");

      const { error: deleteError } = await supabase.from("combo_offer_products").delete().eq("offer_id", existingOffer.id);
      if (deleteError) throw new Error(deleteError.message);
      if (uniqueProducts.length) {
        const { error: insertError } = await supabase.from("combo_offer_products").insert(
          uniqueProducts.map((product, index) => ({
            offer_id: existingOffer.id,
            product_id: product.product_id,
            unit_price: Number(product.unit_price),
            variant_label: String(product.variant_label || "").trim() || null,
            sort_order: Number(product.sort_order ?? index),
            is_active: product.is_active !== false,
          })),
        );
        if (insertError) throw new Error(insertError.message);
      }
    } else {
      if (offer.is_active) {
        const { count, error: countError } = await supabase
          .from("combo_offer_products")
          .select("id", { count: "exact", head: true })
          .eq("offer_id", existingOffer.id)
          .eq("is_active", true);
        if (countError) throw new Error(countError.message);
        if (!count) throw new Error("Add or enable at least one combo product before activating the page.");
      }
      // Keep all combo products aligned with the offer's default individual bottle price when settings are saved
      const { error: syncPriceError } = await supabase
        .from("combo_offer_products")
        .update({ unit_price: offer.default_unit_price })
        .eq("offer_id", existingOffer.id);
      if (syncPriceError) throw new Error(syncPriceError.message);
    }

    const { data: saved, error: saveError } = await supabase
      .from("combo_offers")
      .update(offer)
      .eq("id", existingOffer.id)
      .select("*")
      .single();
    if (saveError) throw new Error(saveError.message);

    const { error: heroSyncError } = await supabase
      .from("hero_slides")
      .update(heroSlideFieldsFromComboOffer(saved))
      .or("desktop_image_url.eq./COMBO.png,cta_href.eq./combo,cta_href.eq./combos");
    if (heroSyncError) throw new Error(`Unable to sync the combo hero slide: ${heroSyncError.message}`);

    return NextResponse.json(await readOffer());
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to save the combo offer." }, { status: 400 });
  }
}

// POST: Create a new dedicated Combo Product (show_in_shop = false) OR attach an existing catalog product
export async function POST(request) {
  if (!isAuthorizedAdminRequest(request)) return unauthorized();
  try {
    const body = await request.json();
    const supabase = createAdminCatalogClient();
    const offer = await ensureOfferRecord(supabase);

    // Mode 1: Toggle or attach an existing shop catalog product into the combo
    if (body.action === "toggle_catalog_product") {
      const productId = String(body.product_id || "").trim();
      if (!productId) throw new Error("Product ID is required.");
      if (body.enabled === false) {
        const { error } = await supabase
          .from("combo_offer_products")
          .delete()
          .eq("offer_id", offer.id)
          .eq("product_id", productId);
        if (error) throw new Error(error.message);
      } else {
        const { data: prod, error: prodError } = await supabase
          .from("products")
          .select("id,price,variant_label,show_in_shop")
          .eq("id", productId)
          .single();
        if (prodError || !prod) throw new Error("Catalog product not found.");
        const unitPrice = body.unit_price !== undefined && body.unit_price !== ""
          ? numberField(body.unit_price, "Combo unit price")
          : Number(offer.default_unit_price || prod.price || 180);
        const variantLabel = String(body.variant_label || prod.variant_label || "").trim() || null;

        const { error: upsertError } = await supabase
          .from("combo_offer_products")
          .upsert(
            {
              offer_id: offer.id,
              product_id: productId,
              unit_price: unitPrice,
              variant_label: variantLabel,
              sort_order: Number(body.sort_order ?? 99),
              is_active: true,
            },
            { onConflict: "offer_id,product_id" },
          );
        if (upsertError) throw new Error(upsertError.message);
      }
      return NextResponse.json(await readOffer());
    }

    // Mode 2: Create a brand-new dedicated combo product (show_in_shop = false)
    const name = String(body.name || "").trim();
    const imageUrl = String(body.image_url || "").trim();
    if (!name) throw new Error("Product name is required.");
    if (!imageUrl) throw new Error("At least one product image is required.");

    const price = Number(offer.default_unit_price || body.price || 180);
    const compareAtPrice = null;
    const stockQuantity = numberField(body.stock_quantity ?? 25, "Stock quantity", true);
    const variantLabel = String(body.variant_label || "Standard").trim() || "Standard";
    const description = String(body.description || "").trim();
    const shortDescription = String(body.short_description || description || name).trim();
    const galleryUrls = Array.isArray(body.gallery_urls)
      ? [...new Set(body.gallery_urls.map((url) => String(url).trim()).filter(Boolean))]
      : [];

    const baseSlug = createSlug(name) || "combo-item";
    const uniqueSlug = `${baseSlug}-combo-${Date.now().toString(36)}`;

    const { data: createdProduct, error: productError } = await supabase
      .from("products")
      .insert({
        name,
        slug: uniqueSlug,
        category_id: null,
        subcategory_id: null,
        short_description: shortDescription,
        description: description || null,
        price,
        compare_at_price: compareAtPrice,
        stock_quantity: stockQuantity,
        image_url: imageUrl,
        gallery_urls: galleryUrls,
        variant_label: variantLabel,
        fragrance_notes: normalizeFragranceNotes(body.fragrance_notes || {}),
        show_in_shop: false,
        is_active: true,
        is_featured: false,
      })
      .select("*")
      .single();
    if (productError) throw new Error(productError.message);

    const { count } = await supabase
      .from("combo_offer_products")
      .select("id", { count: "exact", head: true })
      .eq("offer_id", offer.id);

    const { error: linkError } = await supabase.from("combo_offer_products").insert({
      offer_id: offer.id,
      product_id: createdProduct.id,
      unit_price: price,
      variant_label: variantLabel,
      sort_order: Number(count || 0),
      is_active: true,
    });
    if (linkError) throw new Error(linkError.message);

    return NextResponse.json(await readOffer(), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to add combo product." }, { status: 400 });
  }
}

// PATCH: Update a combo product (either a dedicated combo product or a linked catalog product's combo settings)
export async function PATCH(request) {
  if (!isAuthorizedAdminRequest(request)) return unauthorized();
  try {
    const body = await request.json();
    const productId = String(body.product_id || body.id || "").trim();
    if (!productId) throw new Error("Product ID is required.");

    const supabase = createAdminCatalogClient();
    const offer = await ensureOfferRecord(supabase);

    const { data: existingProduct, error: fetchError } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();
    if (fetchError || !existingProduct) throw new Error("Product not found.");

    const name = String(body.name ?? existingProduct.name).trim();
    const imageUrl = String(body.image_url ?? existingProduct.image_url).trim();
    if (!name || !imageUrl) throw new Error("Product name and image are required.");

    const unitPrice = numberField(body.price ?? body.unit_price ?? existingProduct.price, "Price");
    if (unitPrice <= 0) throw new Error("Price must be greater than 0.");
    const compareAtPrice = body.compare_at_price === undefined || body.compare_at_price === null || body.compare_at_price === ""
      ? null
      : numberField(body.compare_at_price, "Cut price (MRP)");
    if (compareAtPrice !== null && compareAtPrice <= unitPrice) {
      throw new Error("Cut price (MRP) must be greater than the selling price.");
    }
    const stockQuantity = numberField(body.stock_quantity ?? existingProduct.stock_quantity, "Stock quantity", true);
    const variantLabel = String(body.variant_label ?? existingProduct.variant_label ?? "Standard").trim() || "Standard";
    const description = body.description !== undefined ? String(body.description || "").trim() : existingProduct.description;
    const shortDescription = String(body.short_description || description || name).trim();
    const galleryUrls = Array.isArray(body.gallery_urls)
      ? [...new Set(body.gallery_urls.map((url) => String(url).trim()).filter(Boolean))]
      : existingProduct.gallery_urls || [];

    // Update the underlying product row (for combo-only items we update all fields; for catalog items we also allow updating stock/variant_label/images if edited from combo modal)
    const productUpdates = existingProduct.show_in_shop === false
      ? {
          name,
          short_description: shortDescription,
          description: description || null,
          price: unitPrice,
          compare_at_price: compareAtPrice,
          stock_quantity: stockQuantity,
          image_url: imageUrl,
          gallery_urls: galleryUrls,
          variant_label: variantLabel,
          ...(body.fragrance_notes ? { fragrance_notes: normalizeFragranceNotes(body.fragrance_notes) } : {}),
        }
      : {
          image_url: imageUrl,
          gallery_urls: galleryUrls,
          stock_quantity: stockQuantity,
          ...(compareAtPrice !== null ? { compare_at_price: compareAtPrice } : {}),
        };

    const { error: prodUpdateError } = await supabase
      .from("products")
      .update(productUpdates)
      .eq("id", productId);
    if (prodUpdateError) throw new Error(prodUpdateError.message);

    const { error: linkUpdateError } = await supabase
      .from("combo_offer_products")
      .upsert(
        {
          offer_id: offer.id,
          product_id: productId,
          unit_price: unitPrice,
          variant_label: variantLabel,
          sort_order: Number(body.sort_order ?? 0),
          is_active: body.is_active !== false,
        },
        { onConflict: "offer_id,product_id" },
      );
    if (linkUpdateError) throw new Error(linkUpdateError.message);

    return NextResponse.json(await readOffer());
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to update combo product." }, { status: 400 });
  }
}

// DELETE: Remove a product from the combo (and delete dedicated combo-only product if unused in orders)
export async function DELETE(request) {
  if (!isAuthorizedAdminRequest(request)) return unauthorized();
  try {
    const productId = new URL(request.url).searchParams.get("product_id");
    if (!productId) throw new Error("Product ID is required.");

    const supabase = createAdminCatalogClient();
    const offer = await ensureOfferRecord(supabase);

    const { data: existingProduct } = await supabase
      .from("products")
      .select("id,show_in_shop")
      .eq("id", productId)
      .maybeSingle();

    const { error: unlinkError } = await supabase
      .from("combo_offer_products")
      .delete()
      .eq("offer_id", offer.id)
      .eq("product_id", productId);
    if (unlinkError) throw new Error(unlinkError.message);

    if (existingProduct && existingProduct.show_in_shop === false) {
      const { error: deleteProdError } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);
      if (deleteProdError) {
        // Referenced by past orders/carts: soft-deactivate so order history remains intact
        await supabase.from("products").update({ is_active: false }).eq("id", productId);
      }
    }

    return NextResponse.json(await readOffer());
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to remove combo product." }, { status: 400 });
  }
}
