import { NextResponse } from "next/server";
import { ScentValidationError } from "./customPerfume.mjs";

export const scentHeaders = { "Cache-Control": "private, no-store, max-age=0" };

export function scentError(error) {
  if (error instanceof ScentValidationError || error instanceof SyntaxError) {
    return NextResponse.json({ error: error.message }, { status: 400, headers: scentHeaders });
  }
  console.error("Custom perfume operation failed", {
    code: error.code || "unknown",
    message: error.message || "unknown error",
    details: error.details || null,
    hint: error.hint || null,
  });
  return NextResponse.json({ error: "Unable to load or save your scent request. Please try again." }, { status: 503, headers: scentHeaders });
}

export function requireSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new ScentValidationError("Request origin is not allowed.");
}
