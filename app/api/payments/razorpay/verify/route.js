import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRazorpayConfig, razorpayRequest, verifyRazorpaySignature } from "@/lib/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const { keySecret } = getRazorpayConfig();
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

    const body = await request.json();
    const paymentId = String(body?.razorpay_payment_id || "");
    const signature = String(body?.razorpay_signature || "");
    if (!body?.order_id || !body?.razorpay_order_id || !paymentId || !signature) {
      return NextResponse.json({ error: "Incomplete Razorpay payment response." }, { status: 400 });
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id,order_number,total,payment_method,payment_status,razorpay_order_id")
      .eq("id", body.order_id)
      .single();
    if (orderError || !order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (order.payment_method !== "razorpay" || order.razorpay_order_id !== body.razorpay_order_id) {
      return NextResponse.json({ error: "Razorpay order details do not match." }, { status: 400 });
    }
    if (!verifyRazorpaySignature(order.razorpay_order_id, paymentId, signature, keySecret)) {
      return NextResponse.json({ error: "Razorpay payment signature verification failed." }, { status: 400 });
    }

    const payment = await razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`);
    const expectedAmount = Math.round(Number(order.total) * 100);
    if (payment.id !== paymentId || payment.order_id !== order.razorpay_order_id || Number(payment.amount) !== expectedAmount) {
      return NextResponse.json({ error: "Razorpay payment amount or order verification failed." }, { status: 400 });
    }
    if (payment.status !== "captured") {
      return NextResponse.json({ error: "Payment is not captured yet. We will update the order when Razorpay confirms it." }, { status: 202 });
    }

    const { data: confirmed, error: confirmError } = await supabase.rpc("mark_razorpay_payment", {
      p_razorpay_order_id: order.razorpay_order_id,
      p_payment_id: paymentId,
    });
    if (confirmError) return NextResponse.json({ error: confirmError.message }, { status: 409 });
    return NextResponse.json({ success: true, order_number: confirmed.order_number });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to verify Razorpay payment." }, { status: 503 });
  }
}
