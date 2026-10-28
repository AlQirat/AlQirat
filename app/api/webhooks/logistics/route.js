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

const fulfillmentRank = { pending: 0, confirmed: 1, packed: 2, shipped: 3, out_for_delivery: 4, delivered: 5, cancelled: 5, rto: 5 };
const statusById = { 1: "packed", 2: "packed", 3: "packed", 4: "packed", 5: "packed", 6: "shipped", 7: "delivered", 8: "cancelled", 9: "rto", 10: "rto", 11: "pending", 12: "shipped", 13: "confirmed", 14: "rto", 15: "packed", 16: "cancelled", 17: "out_for_delivery", 18: "shipped", 19: "packed", 20: "confirmed", 21: "shipped", 22: "shipped", 23: "delivered", 24: "cancelled", 25: "cancelled", 26: "delivered", 42: "shipped", 45: "cancelled", 46: "rto" };

function getStatusText(payload) {
  const scan = Array.isArray(payload.scans) ? payload.scans[payload.scans.length - 1] : null;
  return [payload.current_status, payload.shipment_status, scan?.["sr-status-label"], scan?.activity].filter(Boolean).join(" ").trim().toLowerCase();
}

function normalizeFulfillmentStatus(payload) {
  const value = getStatusText(payload);
  const statusId = Number(payload.shipment_status_id || payload.current_status_id);
  if (value.includes("delivered")) return "delivered";
  if (value.includes("rto") || value.includes("return to origin") || value.includes("return initiated")) return "rto";
  if (value.includes("cancel")) return "cancelled";
  if (value.includes("out for delivery") || value.includes("ofd")) return "out_for_delivery";
  if (value.includes("transit") || value.includes("picked up") || value.includes("shipped")) return "shipped";
  if (value.includes("manifest") || value.includes("pickup") || value.includes("awb") || value.includes("assigned") || value.includes("label")) return "packed";
  return statusById[statusId] || null;
}

function advanceFulfillmentStatus(current, incoming) {
  if (!incoming) return current || "pending";
  if (["delivered", "cancelled", "rto"].includes(current)) return current;
  if (["cancelled", "rto"].includes(incoming)) return incoming;
  return (fulfillmentRank[incoming] ?? 0) >= (fulfillmentRank[current] ?? 0) ? incoming : (current || incoming);
}

function orderStatusForFulfillment(status) {
  if (status === "delivered") return "delivered";
  if (["cancelled", "rto"].includes(status)) return "cancelled";
  if (["shipped", "out_for_delivery"].includes(status)) return "shipped";
  if (["confirmed", "packed"].includes(status)) return "processing";
  return "pending";
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
    const { data, error } = await admin.from("orders").select("id,status,fulfillment_status").eq(column, String(value)).maybeSingle();
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

    const incomingFulfillmentStatus = normalizeFulfillmentStatus(payload);
    const fulfillmentStatus = advanceFulfillmentStatus(order.fulfillment_status, incomingFulfillmentStatus);
    const update = {
      status: incomingFulfillmentStatus ? orderStatusForFulfillment(fulfillmentStatus) : order.status,
      fulfillment_status: fulfillmentStatus,
      shiprocket_awb: payload.awb ? String(payload.awb) : undefined,
      shiprocket_shipment_id: payload.shipment_id ? String(payload.shipment_id) : undefined,
      shiprocket_order_id: payload.sr_order_id ? String(payload.sr_order_id) : undefined,
      shiprocket_courier_name: payload.courier_name ? String(payload.courier_name) : undefined,
      shiprocket_status: payload.current_status || payload.shipment_status || null,
      shiprocket_status_id: Number.isInteger(Number(payload.current_status_id || payload.shipment_status_id)) ? Number(payload.current_status_id || payload.shipment_status_id) : null,
      shiprocket_label_url: payload.label_url || payload.label || undefined,
      shiprocket_tracking_url: payload.tracking_url || payload.tracking_link || undefined,
      shiprocket_last_event: payload,
      shiprocket_last_event_at: new Date().toISOString(),
      fulfillment_error: null,
      fulfillment_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { error } = await admin.from("orders").update(update).eq("id", order.id);
    if (error) throw error;

    return NextResponse.json({ received: true, matched: true });
  } catch (error) {
    console.error("[logistics-webhook] processing failed", { message: error.message });
    return NextResponse.json({ error: "Unable to process logistics webhook." }, { status: 503 });
  }
}
