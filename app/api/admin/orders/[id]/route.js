import { NextResponse } from "next/server";
import { createAdminCatalogClient, isAuthorizedAdminRequest } from "@/lib/adminCatalog";

const orderStatuses = new Set(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]);
const paymentStatuses = new Set(["pending", "paid", "failed", "refunded"]);
const fulfillmentStatuses = new Set(["pending", "confirmed", "packed", "shipped", "out_for_delivery", "delivered", "cancelled", "rto"]);

export async function PATCH(request, { params }) {
  if (!isAuthorizedAdminRequest(request)) return NextResponse.json({ error: "Administrator authentication is required." }, { status: 401 });
  const body = await request.json();
  if (body.status !== undefined && !orderStatuses.has(body.status)) return NextResponse.json({ error: "Invalid order status." }, { status: 400 });
  if (body.payment_status !== undefined && !paymentStatuses.has(body.payment_status)) return NextResponse.json({ error: "Invalid payment status." }, { status: 400 });
  if (body.fulfillment_status !== undefined && !fulfillmentStatuses.has(body.fulfillment_status)) return NextResponse.json({ error: "Invalid fulfillment status." }, { status: 400 });

  const updates = {};
  if (body.status !== undefined) updates.status = body.status;
  if (body.payment_status !== undefined) updates.payment_status = body.payment_status;
  if (body.fulfillment_status !== undefined) updates.fulfillment_status = body.fulfillment_status;
  if (body.shiprocket_courier_name !== undefined) updates.shiprocket_courier_name = body.shiprocket_courier_name?.trim() || null;
  if (body.shiprocket_awb !== undefined) updates.shiprocket_awb = body.shiprocket_awb?.trim() || null;
  if (body.shipping_address !== undefined) {
    if (!body.shipping_address || typeof body.shipping_address !== "object") return NextResponse.json({ error: "Shipping address must be an object." }, { status: 400 });
    updates.shipping_address = body.shipping_address;
  }
  if (body.fulfillment_status !== undefined || body.shiprocket_courier_name !== undefined || body.shiprocket_awb !== undefined) {
    updates.fulfillment_updated_at = new Date().toISOString();
  }
  if (!Object.keys(updates).length) return NextResponse.json({ error: "No order changes were provided." }, { status: 400 });

  const supabase = createAdminCatalogClient();
  const { data, error } = await supabase
    .from("orders")
    .update(updates)
    .eq("id", params.id)
    .select("id,status,payment_status,shipping_address,fulfillment_status,shiprocket_awb,shiprocket_courier_name,fulfillment_updated_at,updated_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ order: data });
}
