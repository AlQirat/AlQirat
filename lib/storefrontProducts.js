// Turns a database product row (as returned by /api/storefront/catalog) into the shape the UI uses.
export function mapStorefrontProduct(product) {
  return {
    id: product.id,
    slug: product.slug,
    src: product.image_url,
    galleryUrls: Array.isArray(product.gallery_urls) ? product.gallery_urls : [],
    name: product.name,
    desc: product.short_description,
    description: product.description,
    price: Number(product.price),
    stockQuantity: Number(product.stock_quantity),
    rating: Number(product.rating),
    reviews: Number(product.review_count),
    isFeatured: Boolean(product.is_featured),
    category: product.categories?.name || "Uncategorized",
    categorySlug: product.categories?.slug,
    subCategory: product.subcategories?.name || "General",
    badge: product.badge,
    variants: Array.isArray(product.variants) ? product.variants : [],
    tone: "from-sage to-cream",
  };
}

export function getProductKey(product) {
  return String(product.slug || product.name || "").trim().toLowerCase();
}
