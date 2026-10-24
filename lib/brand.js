// Single place for brand identity. Components read from here so the name, contact details
// and social links only ever need changing in one file.
export const brand = {
  name: "Al Qirat Perfumes",
  shortName: "Al Qirat",
  legalName: "Al Qirat Perfumes & Attars",
  descriptor: "Premium Perfumes & Attars",
  tagline: "The fragrance of luxury… the hallmark of refined taste.",
  heroTagline: "Imported Luxury | Timeless Scents",
  parent: "Livik",
  contact: {
    address: "Aligarh-202001",
    phone: "+91 786-8391467",
    email: "qiratperfumes@gmail.com",
    hours: "",
  },
  social: {
    instagram: "https://www.instagram.com/al_qirat_perfumes",
    instagramHandle: "@al_qirat_perfumes",
    facebook: "",
    youtube: "",
    whatsapp: "",
  },
};

export const phoneHref = (phone) => `tel:${phone.replace(/[^+\d]/g, "")}`;
