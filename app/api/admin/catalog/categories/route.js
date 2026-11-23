import { NextResponse } from "next/server";
import { createAdminCatalogClient, createSlug, isAuthorizedAdminRequest } from "@/lib/adminCatalog";
import { parseRedirectLink } from "@/lib/categoryLink";
import { COLLECTIONS } from "@/lib/collections";

function unauthorized() {
  return NextResponse.json({ error: "Administrator authentication is required." }, { status: 401 });
}

export async function GET(request) {
  if (!isAuthorizedAdminRequest(request)) return unauthorized();
  const supabase = createAdminCatalogClient();
  const [{ data: categories, error }, { data: subcategories, error: subcategoryError }, { data: products, error: productError }, { data: comboProducts, error: comboError }] = await Promise.all([
    supabase.from("categories").select("id,name,slug,description,image_url,redirect_url,sort_order,is_active").order("sort_order"),
    supabase.from("subcategories").select("id,category_id,name,slug,sort_order,is_active").order("sort_order"),
    supabase.from("products").select("id,category_id,collection").neq("show_in_shop", false),
    supabase.from("combo_offer_products").select("product_id").eq("is_active", true),
  ]);

  const queryError = error || subcategoryError || productError || comboError;
  if (queryError) return NextResponse.json({ error: queryError.message }, { status: 500 });

  // A category that redirects to a collection page (/attars, /gift-sets ...) or /combos has no products of its
  // own, so its count is that page's product count instead.
  const collectionByPath = new Map(Object.entries(COLLECTIONS).map(([key, info]) => [info.path, key]));
  function countProducts(category) {
    const target = category.redirect_url?.split(/[?#]/)[0].replace(/\/+$/, "");
    const collectionKey = target && collectionByPath.get(target);
    if (collectionKey) return products.filter((product) => product.collection === collectionKey).length;
    if (target === "/combos") return comboProducts.length;
    return products.filter((product) => product.category_id === category.id).length;
  }

  return NextResponse.json({
    categories: categories.map((category) => ({
      ...category,
      subcategories: subcategories.filter((item) => item.category_id === category.id),
      product_count: countProducts(category),
    })),
  });
}

export async function POST(request) {
  if (!isAuthorizedAdminRequest(request)) return unauthorized();
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Category name is required." }, { status: 400 });

  const redirect = parseRedirectLink(body.redirect_url);
  if (redirect.error) return NextResponse.json({ error: redirect.error }, { status: 400 });

  const supabase = createAdminCatalogClient();
  const payload = {
    name,
    slug: createSlug(name),
    description: typeof body.description === "string" ? body.description.trim() || null : null,
    image_url: typeof body.image_url === "string" ? body.image_url.trim() || null : null,
    redirect_url: redirect.value,
    is_active: body.is_active !== false,
  };
  const { data, error } = await supabase.from("categories").insert(payload).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ category: data }, { status: 201 });
}
