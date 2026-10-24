import { NextResponse } from "next/server";
import { createAdminCatalogClient, createSlug, isAuthorizedAdminRequest } from "@/lib/adminCatalog";

export async function PATCH(request, { params }) {
  if (!isAuthorizedAdminRequest(request)) return NextResponse.json({ error: "Administrator authentication is required." }, { status: 401 });
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Subcategory name is required." }, { status: 400 });
  const { data, error } = await createAdminCatalogClient().from("subcategories").update({ name, slug: createSlug(name) }).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ subcategory: data });
}

export async function DELETE(request, { params }) {
  if (!isAuthorizedAdminRequest(request)) return NextResponse.json({ error: "Administrator authentication is required." }, { status: 401 });
  const supabase = createAdminCatalogClient();
  const { count, error: countError } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("subcategory_id", params.id);
  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });
  if (count > 0) return NextResponse.json({ error: `Move the ${count} linked products before deleting this subcategory.` }, { status: 409 });
  const { error } = await supabase.from("subcategories").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
