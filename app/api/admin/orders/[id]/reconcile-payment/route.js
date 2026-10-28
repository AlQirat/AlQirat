import { NextResponse } from "next/server";
import { createAdminCatalogClient, isAuthorizedAdminRequest } from "@/lib/adminCatalog";
import { razorpayRequest } from "@/lib/razorpay";

export async function POST(request, { params }) {
  if (!isAuthorizedAdminRequest(request)) return NextResponse.json({ error: "Administrator authentication is required." }, { status: 401 });
  try {
    const supabase = createAdminCatalogClient();
    const { data: order, error: orderError } = await supabase.from("orders").select("id,payment_method,payment_status,total,razorpay_order_id,razorpay_payment_id").eq("id", params.id).maybeSingle();
    if (orderError) throw new Error(orderError.message);
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (order.payment_method !== "razorpay") return NextResponse.json({ error: "This order does not use Razorpay." }, { status: 400 });
    if (!order.razorpay_order_id) return NextResponse.json({ error: "No Razorpay order is linked to this order." }, { status: 400 });
    if (order.payment_status === "paid" && order.razorpay_payment_id) return NextResponse.json({ error: "This order is already marked as paid." }, { status: 409 });
    const payments = await razorpayRequest(`/orders/${encodeURIComponent(order.razorpay_order_id)}/payments`);
    const payment = (payments.items || []).find((item) => item.status === "captured" && Number(item.amount) === Math.round(Number(order.total) * 100));
    if (!payment) return NextResponse.json({ error: "Razorpay has no captured payment matching this order amount yet." }, { status: 409 });
    const { data, error } = await supabase.rpc("mark_razorpay_payment", { p_razorpay_order_id: order.razorpay_order_id, p_payment_id: payment.id });
    if (error) throw new Error(error.message);
    return NextResponse.json({ order: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to reconcile the Razorpay payment." }, { status: 400 });
  }
}
