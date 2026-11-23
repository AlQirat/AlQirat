import { NextResponse } from "next/server";
import { createAdminCatalogClient, createSlug, isAuthorizedAdminRequest, resolveProductSlug } from "@/lib/adminCatalog";
import { normalizeFragranceNotes } from "@/lib/fragranceNotes";
import { parseCollection } from "@/lib/collections";

function normalizeVariants(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("Size options must be an array.");

  const sizes = new Set();
  return value.map((variant, index) => {
    const size = String(variant?.size || "").trim();
    const price = Number(variant?.price);
    const compareAtPrice = variant?.compare_at_price === undefined || variant?.compare_at_price === null || variant?.compare_at_price === "" ? null : Number(variant.compare_at_price);
    const stock = variant?.stock === undefined || variant?.stock === "" ? null : Number(variant.stock);
    if (!size || !Number.isFinite(price) || price < 0) throw new Error(`Size option ${index + 1} must have a valid size and price.`);
    if (compareAtPrice !== null && (!Number.isFinite(compareAtPrice) || compareAtPrice < price)) throw new Error(`MRP for ${size} must be greater than or equal to its selling price.`);
    if (sizes.has(size.toLowerCase())) throw new Error(`Size option “${size}” is repeated.`);
    if (stock !== null && (!Number.isInteger(stock) || stock < 0)) throw new Error(`Stock for ${size} must be a valid whole number.`);
    sizes.add(size.toLowerCase());
    return { size, price, ...(compareAtPrice === null ? {} : { compare_at_price: compareAtPrice }), ...(stock === null ? {} : { stock }) };
  });
}

function formatProductDbError(error) {
  if (error?.code === "23505" || error?.message?.includes("products_slug_key")) {
    return "A product with this name already exists. Please enter a different product name.";
  }
  return error?.message || "Unable to save the product.";
}

function buildPayload(body) {
  const name = String(body.name || "").trim();
  const price = Number(body.price);
  const compareAtPrice = body.compare_at_price === undefined || body.compare_at_price === null || body.compare_at_price === "" ? null : Number(body.compare_at_price);
  const stockQuantity = Number(body.stock_quantity);
  const collection = parseCollection(body.collection);
  if (collection === undefined) throw new Error("Unknown collection.");
  // Special Edition / Gift Set products have no category; shop products need one.
  if (!name || (!collection && !body.category_id) || !body.image_url) throw new Error(collection ? "Name and product image are required." : "Name, category, and product image are required.");
  const slug = createSlug(name);
  if (!slug) throw new Error("Product name must include English letters or numbers.");
  if (!Number.isFinite(price) || price < 0 || !Number.isInteger(stockQuantity) || stockQuantity < 0) throw new Error("Price or stock quantity is invalid.");
  if (compareAtPrice !== null && (!Number.isFinite(compareAtPrice) || compareAtPrice < price)) throw new Error("MRP must be greater than or equal to the selling price.");
  return {
    name,
    slug,
    collection,
    category_id: collection ? null : body.category_id,
    subcategory_id: collection ? null : body.subcategory_id || null,
    short_description: String(body.short_description || "").trim() || name,
    description: String(body.description || "").trim() || null,
    price,
    compare_at_price: compareAtPrice,
    stock_quantity: stockQuantity,
    variants: normalizeVariants(body.variants),
    fragrance_notes: normalizeFragranceNotes(body.fragrance_notes || {}),
    image_url: String(body.image_url).trim(),
    gallery_urls: Array.isArray(body.gallery_urls) ? [...new Set(body.gallery_urls.map((url) => String(url).trim()).filter(Boolean))] : [],
    badge: String(body.badge || "").trim() || null,
    is_active: body.is_active !== false,
    is_featured: body.is_featured === true,
  };
}

export async function PATCH(request, { params }) {
  if (!isAuthorizedAdminRequest(request)) return NextResponse.json({ error: "Administrator authentication is required." }, { status: 401 });
  try {
    const supabase = createAdminCatalogClient();
    const payload = buildPayload(await request.json());
    payload.slug = await resolveProductSlug(supabase, { name: payload.name, categoryId: payload.category_id, excludeId: params.id, collection: payload.collection });
    const { data, error } = await supabase.from("products").update(payload).eq("id", params.id).select().single();
    if (error) return NextResponse.json({ error: formatProductDbError(error) }, { status: 400 });
    return NextResponse.json({ product: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  if (!isAuthorizedAdminRequest(request)) return NextResponse.json({ error: "Administrator authentication is required." }, { status: 401 });
  const supabase = createAdminCatalogClient();
  const { error } = await supabase.from("products").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
