import { NextResponse } from "next/server";
import { fetchStorefrontCatalog } from "@/lib/storefrontServer";
import { parseCollection } from "@/lib/collections";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const collection = parseCollection(new URL(request.url).searchParams.get("collection"));
  if (collection === undefined) return NextResponse.json({ error: "Unknown collection." }, { status: 400 });
  try {
    return NextResponse.json(await fetchStorefrontCatalog(collection), { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
