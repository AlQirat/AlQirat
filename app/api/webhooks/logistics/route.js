import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminCatalogClient } from "@/lib/adminCatalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasValidToken(providedToken, expectedToken) {
  const provided = Buffer.from(providedToken);
  const expected = Buffer.from(expectedToken);
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

function normalizeFulfillmentStatus(payload) {
  const value = String(payload.current_status || payload.shipment_status || "").trim().toLowerCase();
  if (value.includes("delivered")) return "delivered";
  if (value.includes("rto") || value.includes("return")) return "rto";
  if (value.includes("cancel")) return "cancelled";
  if (value.includes("out for delivery")) return "out_for_delivery";
  if (value.includes("transit")) return "in_transit";
  if (value.includes("picked up")) return "picked_up";
  if (value.includes("pickup") || value.includes("manifest")) return "pickup_pending";
  if (value.includes("awb") || value.includes("assigned")) return "awb_assigned";
  return value || "pending";
}

async function findOrder(admin, payload) {
  const lookups = [
    ["shiprocket_awb", payload.awb],
    ["shiprocket_shipment_id", payload.shipment_id],
    ["shiprocket_order_id", payload.sr_order_id],
    ["order_number", payload.order_id],
  ];

  for (const [column, value] of lookups) {
    if (value === undefined || value === null || String(value).trim() === "") continue;
    const { data, error } = await admin.from("orders").select("id").eq(column, String(value)).maybeSingle();
    if (error) throw error;
    if (data) return data;
  }

  return null;
}

export async function POST(request) {
  try {
    const webhookToken = process.env.SHIPROCKET_WEBHOOK_TOKEN;
    if (!webhookToken) return NextResponse.json({ error: "Logistics webhook is not configured." }, { status: 503 });

    const providedToken = request.headers.get("x-api-key") || "";
    if (!hasValidToken(providedToken, webhookToken)) return NextResponse.json({ error: "Invalid webhook token." }, { status: 401 });

    const payload = await request.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
    }

    const admin = createAdminCatalogClient();
    const order = await findOrder(admin, payload);
    if (!order) return NextResponse.json({ received: true, matched: false });

    const { error } = await admin.from("orders").update({
      fulfillment_status: normalizeFulfillmentStatus(payload),
      shiprocket_awb: payload.awb ? String(payload.awb) : undefined,
      shiprocket_shipment_id: payload.shipment_id ? String(payload.shipment_id) : undefined,
      shiprocket_order_id: payload.sr_order_id ? String(payload.sr_order_id) : undefined,
      shiprocket_courier_name: payload.courier_name ? String(payload.courier_name) : undefined,
      shiprocket_status: payload.current_status || payload.shipment_status || null,
      shiprocket_status_id: Number.isInteger(payload.current_status_id) ? payload.current_status_id : null,
      shiprocket_last_event: payload,
      shiprocket_last_event_at: new Date().toISOString(),
      fulfillment_error: null,
      fulfillment_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", order.id);
    if (error) throw error;

    return NextResponse.json({ received: true, matched: true });
  } catch (error) {
    console.error("[logistics-webhook] processing failed", { message: error.message });
    return NextResponse.json({ error: "Unable to process logistics webhook." }, { status: 503 });
  }
}
