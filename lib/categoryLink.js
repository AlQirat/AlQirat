// Optional manual redirect for a category. When set, clicking the category (Shop menu, homepage cards) goes to
// this link instead of the default /shop?category=<slug> filter. Shared by the admin API (validation) and the
// storefront (href), so keep it free of server-only imports.

const MAX_LENGTH = 500;

// Returns { value } with a cleaned link (or null when empty), or { error } when the link is not allowed.
// Only site-relative paths ("/gift-sets") and absolute http(s) URLs are accepted; anything else
// (javascript:, data:, protocol-relative "//host") is rejected.
export function parseRedirectLink(input) {
  if (input === undefined || input === null) return { value: null };
  if (typeof input !== "string") return { error: "Redirect link must be text." };
  const link = input.trim();
  if (!link) return { value: null };
  if (link.length > MAX_LENGTH) return { error: `Redirect link must be ${MAX_LENGTH} characters or fewer.` };
  if (/[\u0000-\u001f\s]/.test(link)) return { error: "Redirect link cannot contain spaces." };

  if (link.startsWith("/")) {
    if (link.startsWith("//") || link.startsWith("/\\")) return { error: "Use a path like /gift-sets or a full https:// link." };
    return { value: link };
  }

  try {
    const url = new URL(link);
    if (url.protocol === "http:" || url.protocol === "https:") return { value: link };
  } catch {
    // falls through to the error below
  }
  return { error: "Use a path like /gift-sets or a full https:// link." };
}

// Where a category should link to on the storefront.
export function getCategoryHref(category) {
  const { value } = parseRedirectLink(category?.redirect_url);
  return value || `/shop?category=${category.slug}`;
}
