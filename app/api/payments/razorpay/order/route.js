import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRazorpayConfig, razorpayRequest } from "@/lib/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const { keyId } = getRazorpayConfig();
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

    const body = await request.json();
    if (!body?.address_id) return NextResponse.json({ error: "A delivery address is required." }, { status: 400 });

    const { data: prepared, error: prepareError } = await supabase.rpc("prepare_customer_razorpay_order", {
      p_address_id: body.address_id,
    });
    if (prepareError) return NextResponse.json({ error: prepareError.message }, { status: 400 });

    if (prepared.razorpay_order_id) {
      return NextResponse.json({
        key_id: keyId,
        order_id: prepared.order_id,
        order_number: prepared.order_number,
        razorpay_order_id: prepared.razorpay_order_id,
        amount: prepared.amount,
        currency: prepared.currency,
      });
    }

    const razorpayOrder = await razorpayRequest("/orders", {
      method: "POST",
      body: JSON.stringify({
        amount: prepared.amount,
        currency: prepared.currency,
        receipt: prepared.order_number,
        notes: { al_qirat_order_id: prepared.order_id },
      }),
    });

    const { data: attached, error: attachError } = await supabase.rpc("set_customer_razorpay_order_id", {
      p_order_id: prepared.order_id,
      p_razorpay_order_id: razorpayOrder.id,
    });
    if (attachError) return NextResponse.json({ error: attachError.message }, { status: 400 });

    return NextResponse.json({
      key_id: keyId,
      order_id: attached.order_id,
      order_number: attached.order_number,
      razorpay_order_id: attached.razorpay_order_id,
      amount: attached.amount,
      currency: attached.currency,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to start Razorpay checkout." }, { status: 503 });
  }
}
