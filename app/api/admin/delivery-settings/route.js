import { NextResponse } from "next/server";
import { createAdminCatalogClient, isAuthorizedAdminRequest } from "@/lib/adminCatalog";

function unauthorized() {
  return NextResponse.json({ error: "Administrator authentication is required." }, { status: 401 });
}

export async function GET(request) {
  if (!isAuthorizedAdminRequest(request)) return unauthorized();
  const { data, error } = await createAdminCatalogClient().from("delivery_settings").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}

export async function PUT(request) {
  if (!isAuthorizedAdminRequest(request)) return unauthorized();
  const body = await request.json();
  const threshold = Number(body.free_shipping_threshold);
  const shipping = Number(body.standard_shipping_amount);
  const currency = String(body.currency_code || "").trim().toUpperCase();
  const message = String(body.delivery_message || "").trim();
  if (![threshold, shipping].every((value) => Number.isFinite(value) && value >= 0)) return NextResponse.json({ error: "Delivery amounts must be valid non-negative numbers." }, { status: 400 });
  if (!/^[A-Z]{3}$/.test(currency) || !message) return NextResponse.json({ error: "Currency and delivery message are required." }, { status: 400 });

  const supabase = createAdminCatalogClient();
  const { data: existing, error: readError } = await supabase.from("delivery_settings").select("id").order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
  const payload = { free_shipping_threshold: threshold, standard_shipping_amount: shipping, currency_code: currency, delivery_message: message };
  const query = existing ? supabase.from("delivery_settings").update(payload).eq("id", existing.id) : supabase.from("delivery_settings").insert(payload);
  const { data, error } = await query.select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ settings: data });
}
