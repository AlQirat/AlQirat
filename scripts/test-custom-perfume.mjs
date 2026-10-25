import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { validateScentRequest, validateScentUpdate, ScentValidationError } from "../lib/customPerfume.mjs";

const valid = {
  id: randomUUID(), reference_brand: "Test inspiration", reference_name: "Amber garden",
  fragrance_notes: "Amber and rose", scent_preferences: "Warm, soft evening fragrance",
  bottle_size: "50", budget: "1500.50", reference_url: "https://example.com/fragrance",
  contact_name: "Test Customer", contact_email: "customer@example.com", contact_phone: "0000000000",
  instructions: "", profile_acknowledged: true,
};

test("submission normalization strips privileged fields and validates every required field", () => {
  const payload = validateScentRequest({ ...valid, auth_user_id: randomUUID(), status: "completed", quotation_amount: 1, internal_notes: "forged" });
  assert.equal(payload.bottle_size, 50);
  assert.equal(payload.budget, 1500.5);
  for (const key of ["auth_user_id", "status", "quotation_amount", "internal_notes"]) assert.equal(Object.hasOwn(payload, key), false);
  for (const key of ["reference_brand", "reference_name", "fragrance_notes", "scent_preferences", "contact_name", "contact_email", "contact_phone"]) {
    assert.throws(() => validateScentRequest({ ...valid, [key]: "" }), ScentValidationError);
  }
});

test("invalid amounts, sizes, URLs, acknowledgement, and overlong instructions are rejected", () => {
  for (const budget of ["", "-1", "1.001", "Infinity", "1000001", null, true]) assert.throws(() => validateScentRequest({ ...valid, budget }), ScentValidationError);
  for (const reference_url of ["javascript:alert(1)", "file:///etc/passwd", "https://user:password@example.com", "not a url"]) assert.throws(() => validateScentRequest({ ...valid, reference_url }), ScentValidationError);
  assert.throws(() => validateScentRequest({ ...valid, bottle_size: 75 }), ScentValidationError);
  assert.throws(() => validateScentRequest({ ...valid, profile_acknowledged: false }), ScentValidationError);
  assert.throws(() => validateScentRequest({ ...valid, instructions: "a".repeat(3001) }), ScentValidationError);
});

test("quotation publication requires amount and details and rejects invalid versions and statuses", () => {
  const update = { version: 1, status: "quoted", quotation_amount: "2500", quotation_details: "50 ml; delivery included; valid for 7 days", internal_notes: "Private production note" };
  assert.equal(validateScentUpdate(update).p_amount, 2500);
  for (const change of [{ quotation_amount: "" }, { quotation_details: "" }, { version: 0 }, { status: "unknown" }]) assert.throws(() => validateScentUpdate({ ...update, ...change }), ScentValidationError);
});
