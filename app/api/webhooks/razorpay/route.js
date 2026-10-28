import { NextResponse } from "next/server";
import { createAdminCatalogClient } from "@/lib/adminCatalog";
import { getRazorpayConfig, verifyRazorpayWebhookSignature } from "@/lib/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    getRazorpayConfig();
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) return NextResponse.json({ error: "Razorpay webhook secret is not configured." }, { status: 503 });

    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") || "";
    if (!verifyRazorpayWebhookSignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json({ error: "Invalid Razorpay webhook signature." }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const paymentEntity = event?.payload?.payment?.entity;
    const orderEntity = event?.payload?.order?.entity;
    const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
    const paymentId = paymentEntity?.id;
    const admin = createAdminCatalogClient();

    if (["payment.captured", "order.paid"].includes(event.event)) {
      if (!razorpayOrderId || !paymentId) return NextResponse.json({ received: true });
      const { error } = await admin.rpc("mark_razorpay_payment", {
        p_razorpay_order_id: razorpayOrderId,
        p_payment_id: paymentId,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    } else if (event.event === "payment.failed") {
      if (razorpayOrderId) {
        const reason = paymentEntity?.error_description || paymentEntity?.error_reason || "Razorpay payment failed.";
        const { error } = await admin.rpc("mark_razorpay_payment_failed", {
          p_razorpay_order_id: razorpayOrderId,
          p_payment_id: paymentId || null,
          p_reason: reason,
        });
        if (error) return NextResponse.json({ error: error.message }, { status: 409 });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to process Razorpay webhook." }, { status: 503 });
  }
}
