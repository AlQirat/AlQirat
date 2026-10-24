import { NextResponse } from "next/server";
import { createAdminCatalogClient } from "@/lib/adminCatalog";
import { isCatalogDatabaseConfigured } from "@/lib/supabase/config";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  // Hidden field that real visitors never fill in; quietly accept and drop bot submissions.
  if (body.website) return NextResponse.json({ success: true });

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!isCatalogDatabaseConfigured()) {
    return NextResponse.json({ error: "Subscriptions are not available yet. Please check back soon." }, { status: 503 });
  }

  const { error } = await createAdminCatalogClient().from("subscribers").insert({ email });
  if (error?.code === "23505") return NextResponse.json({ success: true, alreadySubscribed: true });
  if (error) return NextResponse.json({ error: "We couldn't subscribe you right now. Please try again." }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 201 });
}
