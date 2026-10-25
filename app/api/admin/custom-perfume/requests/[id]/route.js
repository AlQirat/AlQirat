import { NextResponse } from "next/server";
import { createAdminCatalogClient, isAuthorizedAdminRequest } from "@/lib/adminCatalog";
import { validateScentUpdate, ScentValidationError } from "@/lib/customPerfume.mjs";
import { requireSameOrigin, scentError, scentHeaders } from "@/lib/customPerfumeServer";

export async function PATCH(request, { params }) {
  if (!isAuthorizedAdminRequest(request)) return NextResponse.json({ error: "Administrator authentication is required." }, { status: 401 });
  try {
    requireSameOrigin(request);
    if (!/^[0-9a-f-]{36}$/i.test(params.id)) throw new ScentValidationError("Invalid request ID.");
    const payload = validateScentUpdate(await request.json());
    const { error } = await createAdminCatalogClient().rpc("manage_custom_perfume_request", { p_id: params.id, ...payload });
    if (error?.code === "40001") return NextResponse.json({ error: "This request changed in another session. Close and reopen it before saving." }, { status: 409 });
    if (error) throw error;
    return NextResponse.json({ success: true }, { headers: scentHeaders });
  } catch (error) { return scentError(error); }
}
