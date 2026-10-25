import { NextResponse } from "next/server";
import { createAdminCatalogClient, isAuthorizedAdminRequest } from "@/lib/adminCatalog";
import { REQUEST_FIELDS, SCENT_STATUSES, ScentValidationError } from "@/lib/customPerfume.mjs";
import { scentError, scentHeaders } from "@/lib/customPerfumeServer";

export const dynamic = "force-dynamic";

export async function GET(request) {
  if (!isAuthorizedAdminRequest(request)) return NextResponse.json({ error: "Administrator authentication is required." }, { status: 401 });
  try {
    const params = new URL(request.url).searchParams;
    const status = params.get("status") || "all";
    const page = Number(params.get("page") || 1);
    if (!Number.isInteger(page) || page < 1 || page > 100000 || (status !== "all" && !Object.hasOwn(SCENT_STATUSES, status))) throw new ScentValidationError("Invalid request filter.");
    let query = createAdminCatalogClient().from("custom_perfume_requests").select(`${REQUEST_FIELDS},custom_perfume_internal_notes(notes)`, { count: "exact" });
    if (status !== "all") query = query.eq("status", status);
    const { data, error, count } = await query.order("created_at", { ascending: false }).range((page - 1) * 20, page * 20 - 1);
    if (error) throw error;
    const requestIds = data.map((item) => item.id);
    const { data: orders, error: orderError } = requestIds.length
      ? await createAdminCatalogClient().from("orders").select("id,order_number,status,payment_status,total,created_at,custom_perfume_request_id").in("custom_perfume_request_id", requestIds)
      : { data: [], error: null };
    if (orderError) throw orderError;
    const ordersByRequest = new Map((orders || []).map((order) => [order.custom_perfume_request_id, order]));
    return NextResponse.json({ requests: data.map((item) => ({ ...item, custom_order: ordersByRequest.get(item.id) || null })), count }, { headers: scentHeaders });
  } catch (error) { return scentError(error); }
}
