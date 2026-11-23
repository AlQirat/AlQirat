// Product collections that live outside the regular shop catalog. Keep in sync with the check constraints
// in supabase/migrations/20261124_product_collections.sql and 20261124_attar_collection.sql.
export const COLLECTIONS = {
  "special-edition": {
    label: "Special Edition",
    plural: "Special Editions",
    path: "/special-editions",
    eyebrow: "Exclusive Scents",
    description: "Exclusive, limited-run fragrances crafted for true connoisseurs.",
  },
  "gift-set": {
    label: "Gift Set",
    plural: "Gift Sets",
    path: "/gift-sets",
    eyebrow: "Perfect for Every Occasion",
    description: "Considered gift sets from Al Qirat, presented for someone special.",
  },
  attar: {
    label: "Attar",
    plural: "Attars",
    path: "/attars",
    eyebrow: "Pure Perfume Oils",
    description: "Traditional alcohol-free attars, concentrated perfume oils made to be worn close to the skin.",
  },
};

// Returns the collection key when valid, null when absent, and undefined when the value is not recognised.
export function parseCollection(value) {
  if (value === undefined || value === null || value === "") return null;
  return Object.prototype.hasOwnProperty.call(COLLECTIONS, value) ? value : undefined;
}
