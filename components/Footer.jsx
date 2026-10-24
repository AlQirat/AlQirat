import { Mail, MapPin, Phone } from "lucide-react";
import { FaFacebookF, FaInstagram, FaWhatsapp, FaYoutube } from "react-icons/fa";
import Logo from "./Logo";
import { brand, phoneHref } from "@/lib/brand";

const quickLinks = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Wishlist", href: "/wishlist" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "My Account", href: "/account" },
];

const socials = [
  { icon: FaInstagram, label: "Instagram", href: brand.social.instagram, handle: brand.social.instagramHandle },
  { icon: FaFacebookF, label: "Facebook", href: brand.social.facebook },
  { icon: FaYoutube, label: "YouTube", href: brand.social.youtube },
  { icon: FaWhatsapp, label: "WhatsApp", href: brand.social.whatsapp },
].filter((social) => social.href);

const { address, phone, email } = brand.contact;

function ColumnTitle({ children }) {
  return <h4 className="font-serif text-xl font-semibold text-gold-light">{children}</h4>;
}

export default function Footer() {
  return (
    <footer className="bg-ink text-stone-300">
      <div className="container-site grid gap-12 py-14 md:grid-cols-2 lg:grid-cols-[1.15fr_1fr_1.1fr_1fr] lg:gap-10 lg:py-16">
        <div className="flex flex-col items-start">
          <Logo variant="gold" className="h-28" />
          <p className="mt-5 max-w-[260px] text-sm leading-relaxed text-stone-300">
            {brand.tagline}
          </p>
        </div>

        <div>
          <ColumnTitle>Quick Links</ColumnTitle>
          <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm lg:grid-cols-1">
            {quickLinks.map((link) => (
              <li key={link.label}>
                <a href={link.href} className="inline-block transition duration-300 hover:translate-x-1 hover:text-gold-light">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <ColumnTitle>Contact Us</ColumnTitle>
          <ul className="mt-5 space-y-4 text-sm">
            {email && (
              <li className="flex items-center gap-3">
                <Mail size={17} className="shrink-0 text-gold" />
                <a href={`mailto:${email}`} className="transition hover:text-gold-light">{email}</a>
              </li>
            )}
            {phone && (
              <li className="flex items-center gap-3">
                <Phone size={17} className="shrink-0 text-gold" />
                <a href={phoneHref(phone)} className="transition hover:text-gold-light">{phone}</a>
              </li>
            )}
            {address && (
              <li className="flex items-center gap-3">
                <MapPin size={17} className="shrink-0 text-gold" />
                {address}
              </li>
            )}
          </ul>
        </div>

        <div>
          <ColumnTitle>Follow Us</ColumnTitle>
          <ul className="mt-5 space-y-4 text-sm">
            {socials.map(({ icon: Icon, label, href, handle }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 transition hover:text-gold-light"
                >
                  <Icon size={16} className="shrink-0 text-gold" />
                  {handle || label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <p className="container-site py-6 text-center text-xs text-stone-400">
          © {new Date().getFullYear()} {brand.legalName}. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
}
