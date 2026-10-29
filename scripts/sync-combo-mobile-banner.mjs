// Uploads the supplied mobile combo hero artwork to ImageKit and syncs its URL to Supabase.
// Usage: node scripts/sync-combo-mobile-banner.mjs
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const file = path.resolve(".env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].trim();
  }
}

loadEnv();

const {
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  IMAGEKIT_PRIVATE_KEY,
} = process.env;
const localImage = path.resolve("public/perfume_banner.png");

if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !IMAGEKIT_PRIVATE_KEY) {
  throw new Error("Set Supabase service-role and ImageKit private credentials in .env first.");
}
if (!fs.existsSync(localImage)) throw new Error(`Banner image not found: ${localImage}`);

async function uploadToImageKit() {
  const body = new FormData();
  body.append("file", new Blob([fs.readFileSync(localImage)]), "perfume_banner.png");
  body.append("fileName", "perfume_banner.png");
  body.append("folder", "/al-qirat/hero-slides");
  body.append("useUniqueFileName", "false");
  body.append("overwriteFile", "true");
  body.append("tags", "al-qirat,hero-slide,combo-offer");

  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${IMAGEKIT_PRIVATE_KEY}:`).toString("base64")}` },
    body,
  });
  const result = await response.json();
  if (!response.ok || !result.url) throw new Error(`ImageKit upload failed: ${result.message || response.status}`);
  return result.url;
}

async function main() {
  const imageUrl = await uploadToImageKit();
  const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: offer, error: offerReadError } = await supabase
    .from("combo_offers")
    .select("id")
    .eq("slug", "choose-any-3")
    .single();
  if (offerReadError) throw new Error(`Read combo offer failed: ${offerReadError.message}`);

  const { error: offerUpdateError } = await supabase
    .from("combo_offers")
    .update({ mobile_banner_image_url: imageUrl })
    .eq("id", offer.id);
  if (offerUpdateError) throw new Error(`Update combo offer failed: ${offerUpdateError.message}`);

  const { error: slideUpdateError } = await supabase
    .from("hero_slides")
    .update({ mobile_image_url: imageUrl })
    .or("desktop_image_url.eq./COMBO.png,cta_href.eq./combo");
  if (slideUpdateError) throw new Error(`Update hero slide failed: ${slideUpdateError.message}`);

  const { data: savedOffer, error: savedOfferError } = await supabase
    .from("combo_offers")
    .select("mobile_banner_image_url")
    .eq("id", offer.id)
    .single();
  if (savedOfferError || savedOffer.mobile_banner_image_url !== imageUrl) {
    throw new Error(`Verify combo offer failed: ${savedOfferError?.message || "stored URL does not match"}`);
  }

  const { data: savedSlides, error: savedSlidesError } = await supabase
    .from("hero_slides")
    .select("mobile_image_url")
    .or("desktop_image_url.eq./COMBO.png,cta_href.eq./combo");
  if (savedSlidesError || !savedSlides.some((slide) => slide.mobile_image_url === imageUrl)) {
    throw new Error(`Verify hero slide failed: ${savedSlidesError?.message || "stored URL does not match"}`);
  }

  console.log("Synced combo mobile banner to ImageKit and Supabase.");
  console.log("Verified ImageKit URL in combo_offers.mobile_banner_image_url and hero_slides.mobile_image_url.");
}

main().catch((error) => {
  console.error(`FAILED: ${error.message}`);
  process.exit(1);
});
