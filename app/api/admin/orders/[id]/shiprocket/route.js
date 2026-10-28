import { NextResponse } from "next/server";
import { createAdminCatalogClient, isAuthorizedAdminRequest } from "@/lib/adminCatalog";
import { assignShiprocketAwb, createShiprocketOrder, extractShiprocketValue, getShiprocketMessage, getShiprocketPickupLocation, getShiprocketToken } from "@/lib/shiprocket";

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function number(value, field) {
  const result = Number(value);
  if (!Number.isFinite(result) || result <= 0) throw new Error(`${field} must be greater than zero.`);
  return result;
}

function getAddress(order) {
  const address = order.shipping_address || {};
  const customerName = text(address.recipient_name) || text(order.customers?.full_name) || "Customer";
  const phone = text(address.phone) || text(order.customers?.phone);
  const email = text(order.customer_email) || text(order.customers?.email);
  const addressLine = text(address.address_line_1);
  const city = text(address.city);
  const state = text(address.state);
  const postalCode = text(address.postal_code);
  const country = text(address.country) || "India";
  if (!phone || !email || !addressLine || !city || !state || !postalCode) throw new Error("The order needs a complete shipping address, email, and phone number before a shipment can be created.");
  return { customerName, phone, email, addressLine, addressLine2: text(address.address_line_2), city, state, postalCode, country };
}

function createPayload(order, body) {
  const address = getAddress(order);
  const weight = number(body.weight, "Weight");
  const length = number(body.length, "Length");
  const breadth = number(body.breadth, "Width");
  const height = number(body.height, "Height");
  const items = (order.order_items || []).map((item, index) => ({
    name: item.product_name,
    sku: item.product_id || `${order.order_number}-${index + 1}`,
    units: Number(item.quantity),
    selling_price: Number(item.unit_price),
    discount: "",
    tax: "",
    hsn: "",
  }));
  if (!items.length) throw new Error("The order has no products to send to Shiprocket.");
  return {
    order_id: order.order_number,
    order_date: new Date(order.created_at).toISOString().slice(0, 19).replace("T", " "),
    pickup_location: getShiprocketPickupLocation(),
    billing_customer_name: address.customerName,
    billing_last_name: "",
    billing_address: address.addressLine,
    billing_address_2: address.addressLine2,
    billing_city: address.city,
    billing_pincode: address.postalCode,
    billing_state: address.state,
    billing_country: address.country,
    billing_email: address.email,
    billing_phone: address.phone,
    shipping_is_billing: true,
    shipping_customer_name: address.customerName,
    shipping_last_name: "",
    shipping_address: address.addressLine,
    shipping_address_2: address.addressLine2,
    shipping_city: address.city,
    shipping_pincode: address.postalCode,
    shipping_state: address.state,
    shipping_country: address.country,
    shipping_email: address.email,
    shipping_phone: address.phone,
    order_items: items,
    payment_method: String(order.payment_method).toLowerCase() === "cod" ? "COD" : "Prepaid",
    shipping_charges: Number(order.shipping_amount || 0),
    sub_total: Number(order.subtotal || order.total || 0),
    length,
    breadth,
    height,
    weight,
  };
}

export async function POST(request, { params }) {
  if (!isAuthorizedAdminRequest(request)) return NextResponse.json({ error: "Administrator authentication is required." }, { status: 401 });
  let supabase;
  let order;
  try {
    const body = await request.json();
    supabase = createAdminCatalogClient();
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("id,order_number,customer_email,shipping_address,payment_method,payment_status,subtotal,shipping_amount,total,created_at,status,shiprocket_order_id,shiprocket_shipment_id,shiprocket_awb,customers(full_name,email,phone),order_items(id,product_id,product_name,unit_price,quantity)")
      .eq("id", params.id)
      .maybeSingle();
    if (orderError) throw new Error(orderError.message);
    order = orderData;
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (order.status === "cancelled") return NextResponse.json({ error: "Cancelled orders cannot be shipped." }, { status: 409 });
    if (order.payment_method === "razorpay" && order.payment_status !== "paid") return NextResponse.json({ error: "Confirm the Razorpay payment before creating a shipment." }, { status: 409 });
    if (order.shiprocket_awb) return NextResponse.json({ error: "This order already has an AWB assigned." }, { status: 409 });

    const { token, baseUrl } = await getShiprocketToken();
    let shiprocketOrderId = order.shiprocket_order_id;
    let shipmentId = order.shiprocket_shipment_id;
    if (!shiprocketOrderId || !shipmentId) {
      const created = await createShiprocketOrder(token, baseUrl, createPayload(order, body));
      shiprocketOrderId = String(extractShiprocketValue(created, "order_id") || "");
      shipmentId = String(extractShiprocketValue(created, "shipment_id") || "");
      if (!shiprocketOrderId || !shipmentId) throw new Error("Shiprocket created the order but did not return order and shipment IDs.");
      const { error: saveCreatedError } = await supabase.from("orders").update({ shiprocket_order_id: shiprocketOrderId, shiprocket_shipment_id: shipmentId, fulfillment_status: "confirmed", fulfillment_error: null, fulfillment_updated_at: new Date().toISOString() }).eq("id", order.id);
      if (saveCreatedError) throw new Error(saveCreatedError.message);
    }

    const assigned = await assignShiprocketAwb(token, baseUrl, shipmentId);
    const awb = String(extractShiprocketValue(assigned, "awb_code") || "");
    const courier = extractShiprocketValue(assigned, "courier_name");
    if (!awb) throw new Error(getShiprocketMessage(assigned) || `Shiprocket did not return an AWB number for shipment ${shipmentId}. Check courier availability and pickup-location serviceability.`);
    const update = { status: "processing", shiprocket_order_id: shiprocketOrderId, shiprocket_shipment_id: shipmentId, shiprocket_awb: awb, shiprocket_courier_name: courier ? String(courier) : null, shiprocket_status: "AWB Assigned", fulfillment_status: "confirmed", fulfillment_error: null, fulfillment_updated_at: new Date().toISOString() };
    const { data: savedOrder, error } = await supabase.from("orders").update(update).eq("id", order.id).select("id,fulfillment_status,shiprocket_order_id,shiprocket_shipment_id,shiprocket_awb,shiprocket_courier_name,shiprocket_status,fulfillment_error,fulfillment_updated_at").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ order: savedOrder });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create the Shiprocket shipment.";
    if (supabase && order) await supabase.from("orders").update({ fulfillment_error: message, fulfillment_updated_at: new Date().toISOString() }).eq("id", order.id);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
