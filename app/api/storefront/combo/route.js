import { NextResponse } from "next/server";
import { fetchStorefrontComboOffer } from "@/lib/storefrontServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const offer = await fetchStorefrontComboOffer();
    return NextResponse.json({ offer: offer?.is_active ? offer : null }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
