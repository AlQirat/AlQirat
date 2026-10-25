import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { REQUEST_FIELDS, validateScentRequest } from "@/lib/customPerfume.mjs";
import { requireSameOrigin, scentError, scentHeaders } from "@/lib/customPerfumeServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Please sign in to view your requests." }, { status: 401 });
    const { data, error } = await supabase.from("custom_perfume_requests")
      .select(`${REQUEST_FIELDS},custom_perfume_updates(id,status,quotation_amount,quotation_details,created_at)`)
      .eq("auth_user_id", user.id).order("created_at", { ascending: false });
    if (error) throw error;
    const requestIds = data.map((item) => item.id);
    const { data: orders, error: orderError } = requestIds.length
      ? await supabase.from("orders").select("id,order_number,status,payment_status,total,created_at,custom_perfume_request_id").in("custom_perfume_request_id", requestIds)
      : { data: [], error: null };
    if (orderError) throw orderError;
    const ordersByRequest = new Map((orders || []).map((order) => [order.custom_perfume_request_id, order]));
    return NextResponse.json({ requests: data.map((item) => ({ ...item, custom_order: ordersByRequest.get(item.id) || null })) }, { headers: scentHeaders });
  } catch (error) { return scentError(error); }
}

export async function POST(request) {
  try {
    requireSameOrigin(request);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Please sign in before submitting your request." }, { status: 401 });
    const payload = validateScentRequest(await request.json());
    // Retrying the same submission after a lost response must not create duplicates.
    const { data: existing, error: existingError } = await supabase.from("custom_perfume_requests").select("id").eq("id", payload.id).eq("auth_user_id", user.id).maybeSingle();
    if (existingError) throw existingError;
    if (existing) return NextResponse.json({ request: existing }, { headers: scentHeaders });
    const { data, error } = await supabase.from("custom_perfume_requests").insert(payload).select("id").single();
    if (error?.code === "P0001") return NextResponse.json({ error: "Custom perfume requests are currently paused." }, { status: 409 });
    if (error?.code === "23505") {
      const retry = await supabase.from("custom_perfume_requests").select("id").eq("id", payload.id).eq("auth_user_id", user.id).maybeSingle();
      if (retry.data) return NextResponse.json({ request: retry.data }, { headers: scentHeaders });
    }
    if (error) throw error;
    return NextResponse.json({ request: data }, { status: 201, headers: scentHeaders });
  } catch (error) { return scentError(error); }
}
