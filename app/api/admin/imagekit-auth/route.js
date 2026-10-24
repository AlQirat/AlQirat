import { createHmac, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { isAuthorizedAdminRequest } from "@/lib/adminCatalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Signed, short-lived parameters that let the admin's browser upload straight to ImageKit.
// Uploading from the browser avoids Vercel's ~4.5 MB serverless request-body limit.
export async function GET(request) {
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ error: "Administrator authentication is required." }, { status: 401 });
  }

  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
  if (!privateKey || !publicKey) {
    return NextResponse.json({ error: "ImageKit is not configured. Set IMAGEKIT_PRIVATE_KEY and NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY." }, { status: 503 });
  }

  const token = randomUUID();
  const expire = Math.floor(Date.now() / 1000) + 30 * 60 - 60;
  const signature = createHmac("sha1", privateKey).update(token + expire).digest("hex");
  return NextResponse.json({ token, expire, signature, publicKey }, { headers: { "Cache-Control": "no-store" } });
}
