import { NextResponse } from "next/server";
import { createAdminCatalogClient } from "@/lib/adminCatalog";
import { createClient } from "@/lib/supabase/server";
import { isCatalogDatabaseConfigured, isSupabaseConfigured } from "@/lib/supabase/config";

async function findProduct(slug) {
  const { data, error } = await createAdminCatalogClient().from("products").select("id,name").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function GET(_request, { params }) {
  if (!isCatalogDatabaseConfigured()) return NextResponse.json({ reviews: [] });
  try {
    const product = await findProduct(params.slug);
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    const { data, error } = await createAdminCatalogClient().from("reviews").select("id,customer_name,rating,title,body,created_at").eq("product_id", product.id).eq("is_approved", true).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json({ reviews: data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  if (!isSupabaseConfigured() || !isCatalogDatabaseConfigured()) {
    return NextResponse.json({ error: "Reviews are not available yet. Please check back soon." }, { status: 503 });
  }
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to submit a review." }, { status: 401 });

    const product = await findProduct(params.slug);
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    const body = await request.json();
    const rating = Number(body.rating);
    const title = String(body.title || "").trim();
    const reviewBody = String(body.body || "").trim();
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
    if (!title || title.length > 100 || reviewBody.length < 10 || reviewBody.length > 1500) return NextResponse.json({ error: "Enter a title and a review between 10 and 1500 characters." }, { status: 400 });

    const { data: customer } = await supabase.from("customers").select("full_name").eq("auth_user_id", user.id).maybeSingle();
    const customerName = customer?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Al Qirat customer";
    const { data: existing } = await supabase.from("reviews").select("id").eq("product_id", product.id).eq("auth_user_id", user.id).maybeSingle();
    const reviewPayload = { product_id: product.id, auth_user_id: user.id, customer_name: customerName, rating, title, body: reviewBody, is_approved: false };
    const query = existing
      ? supabase.from("reviews").update(reviewPayload).eq("id", existing.id)
      : supabase.from("reviews").insert(reviewPayload);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true }, { status: existing ? 200 : 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
