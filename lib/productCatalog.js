// Product data lives in the database and is managed from /admin. This file only holds helpers.
export function createProductSlug(name) {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getProductPath(product) {
  return `/products/${product.slug || createProductSlug(product.name)}`;
}
