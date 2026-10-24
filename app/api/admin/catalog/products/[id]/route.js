import { NextResponse } from "next/server";
import { createAdminCatalogClient, createSlug, isAuthorizedAdminRequest } from "@/lib/adminCatalog";

function normalizeVariants(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("Size options must be an array.");

  const sizes = new Set();
  return value.map((variant, index) => {
    const size = String(variant?.size || "").trim();
    const price = Number(variant?.price);
    const stock = variant?.stock === undefined || variant?.stock === "" ? null : Number(variant.stock);
    if (!size || !Number.isFinite(price) || price < 0) throw new Error(`Size option ${index + 1} must have a valid size and price.`);
    if (sizes.has(size.toLowerCase())) throw new Error(`Size option “${size}” is repeated.`);
    if (stock !== null && (!Number.isInteger(stock) || stock < 0)) throw new Error(`Stock for ${size} must be a valid whole number.`);
    sizes.add(size.toLowerCase());
    return { size, price, ...(stock === null ? {} : { stock }) };
  });
}

function buildPayload(body) {
  const name = String(body.name || "").trim();
  const price = Number(body.price);
  const stockQuantity = Number(body.stock_quantity);
  if (!name || !body.category_id || !body.image_url) throw new Error("Name, category, and product image are required.");
  if (!Number.isFinite(price) || price < 0 || !Number.isInteger(stockQuantity) || stockQuantity < 0) throw new Error("Price or stock quantity is invalid.");
  return {
    name,
    slug: createSlug(name),
    category_id: body.category_id,
    subcategory_id: body.subcategory_id || null,
    short_description: String(body.short_description || "").trim() || name,
    description: String(body.description || "").trim() || null,
    price,
    stock_quantity: stockQuantity,
    variants: normalizeVariants(body.variants),
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
    const { data, error } = await supabase.from("products").update(buildPayload(await request.json())).eq("id", params.id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
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
