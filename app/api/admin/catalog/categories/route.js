import { NextResponse } from "next/server";
import { createAdminCatalogClient, createSlug, isAuthorizedAdminRequest } from "@/lib/adminCatalog";

function unauthorized() {
  return NextResponse.json({ error: "Administrator authentication is required." }, { status: 401 });
}

export async function GET(request) {
  if (!isAuthorizedAdminRequest(request)) return unauthorized();
  const supabase = createAdminCatalogClient();
  const [{ data: categories, error }, { data: subcategories, error: subcategoryError }, { data: products, error: productError }] = await Promise.all([
    supabase.from("categories").select("id,name,slug,description,image_url,sort_order,is_active").order("sort_order"),
    supabase.from("subcategories").select("id,category_id,name,slug,sort_order,is_active").order("sort_order"),
    supabase.from("products").select("id,category_id"),
  ]);

  const queryError = error || subcategoryError || productError;
  if (queryError) return NextResponse.json({ error: queryError.message }, { status: 500 });

  return NextResponse.json({
    categories: categories.map((category) => ({
      ...category,
      subcategories: subcategories.filter((item) => item.category_id === category.id),
      product_count: products.filter((product) => product.category_id === category.id).length,
    })),
  });
}

export async function POST(request) {
  if (!isAuthorizedAdminRequest(request)) return unauthorized();
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Category name is required." }, { status: 400 });

  const supabase = createAdminCatalogClient();
  const payload = {
    name,
    slug: createSlug(name),
    description: typeof body.description === "string" ? body.description.trim() || null : null,
    image_url: typeof body.image_url === "string" ? body.image_url.trim() || null : null,
    is_active: body.is_active !== false,
  };
  const { data, error } = await supabase.from("categories").insert(payload).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ category: data }, { status: 201 });
}
