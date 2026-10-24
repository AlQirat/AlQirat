import { NextResponse } from "next/server";
import { createAdminCatalogClient, createSlug, isAuthorizedAdminRequest } from "@/lib/adminCatalog";

export async function POST(request) {
  if (!isAuthorizedAdminRequest(request)) return NextResponse.json({ error: "Administrator authentication is required." }, { status: 401 });
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || !body.category_id) return NextResponse.json({ error: "Category and subcategory name are required." }, { status: 400 });
  const supabase = createAdminCatalogClient();
  const { data, error } = await supabase.from("subcategories").insert({ category_id: body.category_id, name, slug: createSlug(name) }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ subcategory: data }, { status: 201 });
}
