import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { validateScentRequest, validateScentUpdate, ScentValidationError } from "../lib/customPerfume.mjs";

const valid = {
  id: randomUUID(), reference_brand: "Al Qirat", reference_name: "Amber garden",
  contact_email: "customer@example.com", contact_phone: "0000000000",
};

test("guest submissions accept only the four public fields and strip privileged data", () => {
  const payload = validateScentRequest({ ...valid, auth_user_id: randomUUID(), status: "completed", budget: 1, internal_notes: "forged" });
  assert.deepEqual(Object.keys(payload).sort(), ["contact_email", "contact_phone", "id", "reference_brand", "reference_name"]);
  assert.equal(payload.contact_email, "customer@example.com");
  for (const key of ["reference_brand", "reference_name", "contact_email", "contact_phone"]) {
    assert.throws(() => validateScentRequest({ ...valid, [key]: "" }), ScentValidationError);
  }
});

test("invalid email, phone, and identifiers are rejected", () => {
  for (const contact_email of ["", "not-an-email", "guest@example", "guest @example.com"]) assert.throws(() => validateScentRequest({ ...valid, contact_email }), ScentValidationError);
  for (const contact_phone of ["", "123", "abc1234567", "1".repeat(21)]) assert.throws(() => validateScentRequest({ ...valid, contact_phone }), ScentValidationError);
  assert.throws(() => validateScentRequest({ ...valid, id: "not-a-uuid" }), ScentValidationError);
});

test("quotation publication requires amount and details and rejects invalid versions and statuses", () => {
  const update = { version: 1, status: "quoted", quotation_amount: "2500", quotation_details: "Inspired fragrance profile; delivery included; valid for seven days", internal_notes: "Private production note" };
  assert.equal(validateScentUpdate(update).p_amount, 2500);
  for (const change of [{ quotation_amount: "" }, { quotation_details: "" }, { version: 0 }, { status: "unknown" }]) assert.throws(() => validateScentUpdate({ ...update, ...change }), ScentValidationError);
});
