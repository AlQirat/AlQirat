import { brand } from "@/lib/brand";

// bronze: deeper gold, for light backgrounds (header, auth pages, mobile menu) where bright gold washes out.
// gold:   bright gold, for dark backgrounds such as the footer.
// emblem: round monogram for tight spots such as the admin panel badge.
const sources = {
  bronze: "/images/logo-bronze.png",
  gold: "/images/logo-gold.png",
  emblem: "/fevicon.png",
};

export default function Logo({ className = "h-14", variant = "bronze" }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={sources[variant] || sources.bronze}
      alt={brand.name}
      className={`w-auto select-none ${className}`}
    />
  );
}
