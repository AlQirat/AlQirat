const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// Browser-side upload straight to ImageKit using server-signed parameters from /api/admin/imagekit-auth.
export async function uploadImage(file, folder = "/al-qirat/products") {
  if (!file.type.startsWith("image/")) throw new Error("Only image files can be uploaded.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Images must be 10 MB or smaller.");

  const authResponse = await fetch("/api/admin/imagekit-auth", { cache: "no-store" });
  const auth = await authResponse.json().catch(() => ({}));
  if (!authResponse.ok) throw new Error(auth.error || "Unable to authorise the image upload.");

  const extension = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "upload";

  const body = new FormData();
  body.append("file", file);
  body.append("fileName", `${baseName}.${extension}`);
  body.append("folder", folder);
  body.append("useUniqueFileName", "true");
  body.append("tags", "al-qirat,admin-upload");
  body.append("publicKey", auth.publicKey);
  body.append("signature", auth.signature);
  body.append("expire", String(auth.expire));
  body.append("token", auth.token);

  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", { method: "POST", body });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.url) throw new Error(result.message || "Image upload failed.");
  return result.url;
}
