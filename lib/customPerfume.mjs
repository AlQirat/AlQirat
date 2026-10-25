export const SCENT_STATUSES = { new: "Submitted", reviewing: "Under review", quoted: "Quotation ready", in_progress: "In progress", completed: "Completed", declined: "Declined", cancelled: "Cancelled" };
export const BOTTLE_SIZES = [30, 50, 100];
export const SCENT_DISCLAIMER = "We create a similar fragrance profile inspired by your preferences. We do not guarantee an exact replica of another brand’s proprietary formula.";
export const REQUEST_FIELDS = "id,reference_brand,reference_name,fragrance_notes,scent_preferences,bottle_size,budget,reference_url,contact_name,contact_email,contact_phone,instructions,status,quotation_amount,quotation_details,version,created_at,updated_at";

export class ScentValidationError extends Error {}

function textField(body, key, minimum, maximum) {
  if (typeof body[key] !== "string") throw new ScentValidationError(`Enter a valid ${key.replaceAll("_", " ")}.`);
  const value = body[key].trim();
  if (value.length < minimum || value.length > maximum) throw new ScentValidationError(`${key.replaceAll("_", " ")} must contain ${minimum}–${maximum} characters.`);
  return value;
}

function amount(value) {
  if (!["number", "string"].includes(typeof value) || !/^\d+(\.\d{1,2})?$/.test(String(value))) throw new ScentValidationError("Enter an amount with at most two decimal places.");
  const result = Number(value);
  if (!Number.isFinite(result) || result <= 0 || result > 1000000) throw new ScentValidationError("Amount must be between ₹0.01 and ₹10,00,000.");
  return result;
}

export function validateScentRequest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ScentValidationError("Enter valid request details.");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id || "")) throw new ScentValidationError("Invalid submission identifier. Reload and try again.");
  const payload = { id: body.id };
  for (const [key, min, max] of [
    ["reference_brand", 1, 120], ["reference_name", 1, 160], ["fragrance_notes", 3, 2000],
    ["scent_preferences", 3, 2000], ["reference_url", 0, 2000], ["contact_name", 2, 120],
    ["contact_email", 3, 254], ["contact_phone", 7, 20], ["instructions", 0, 3000],
  ]) payload[key] = textField(body, key, min, max);
  payload.contact_email = payload.contact_email.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.contact_email)) throw new ScentValidationError("Enter a valid email address.");
  if (!/^[0-9+() -]{7,20}$/.test(payload.contact_phone)) throw new ScentValidationError("Enter a valid phone number.");
  if (payload.reference_url) {
    let url;
    try { url = new URL(payload.reference_url); } catch { throw new ScentValidationError("Enter a valid reference URL."); }
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new ScentValidationError("Reference URL must use HTTP or HTTPS without credentials.");
  }
  payload.bottle_size = Number(body.bottle_size);
  if (!BOTTLE_SIZES.includes(payload.bottle_size)) throw new ScentValidationError("Choose a 30, 50, or 100 ml bottle.");
  payload.budget = amount(body.budget);
  if (body.profile_acknowledged !== true) throw new ScentValidationError("Please acknowledge the fragrance profile information.");
  payload.profile_acknowledged = true;
  return payload;
}

export function validateScentUpdate(body) {
  if (!body || !Object.hasOwn(SCENT_STATUSES, body.status)) throw new ScentValidationError("Choose a valid status.");
  if (!Number.isInteger(body.version) || body.version < 1) throw new ScentValidationError("Reload this request before saving.");
  const details = textField(body, "quotation_details", 0, 3000);
  const notes = textField(body, "internal_notes", 0, 10000);
  const quotation = body.quotation_amount === null || body.quotation_amount === "" ? null : amount(body.quotation_amount);
  if (body.status === "quoted" && (quotation === null || !details)) throw new ScentValidationError("A quotation needs an amount and details.");
  const publishedStatus = quotation !== null && details && ["new", "reviewing"].includes(body.status) ? "quoted" : body.status;
  return { p_version: body.version, p_status: publishedStatus, p_amount: quotation, p_details: details, p_notes: notes };
}
