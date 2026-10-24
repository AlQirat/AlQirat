import { NextResponse } from "next/server";
import { createAdminCatalogClient, createSlug, isAuthorizedAdminRequest } from "@/lib/adminCatalog";

export async function PATCH(request, { params }) {
  if (!isAuthorizedAdminRequest(request)) return NextResponse.json({ error: "Administrator authentication is required." }, { status: 401 });
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Category name is required." }, { status: 400 });

  const supabase = createAdminCatalogClient();
  const { data, error } = await supabase.from("categories").update({
    name,
    slug: createSlug(name),
    description: typeof body.description === "string" ? body.description.trim() || null : null,
    image_url: typeof body.image_url === "string" ? body.image_url.trim() || null : null,
    is_active: body.is_active !== false,
  }).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ category: data });
}

export async function DELETE(request, { params }) {
  if (!isAuthorizedAdminRequest(request)) return NextResponse.json({ error: "Administrator authentication is required." }, { status: 401 });
  const supabase = createAdminCatalogClient();
  const { count } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("category_id", params.id);
  if (count > 0) return NextResponse.json({ error: `Move or delete the ${count} products in this category first.` }, { status: 409 });
  const { error } = await supabase.from("categories").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
