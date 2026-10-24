import { Clock3, Mail, MapPin, Phone } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ContactForm from "@/components/ContactForm";
import Reveal from "@/components/Reveal";
import StorefrontFaqs from "@/components/StorefrontFaqs";
import { brand } from "@/lib/brand";

export const metadata = {
  title: "Contact Us | Al Qirat Perfumes",
  description: "Contact Al Qirat Perfumes for product, delivery, order, and shopping enquiries.",
};

const { address, phone, email, hours } = brand.contact;
const mapUrl = address ? `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed` : "";

// Entries without a value are skipped until the brand's real contact details are added to lib/brand.js.
const contactItems = [
  address && { icon: MapPin, title: "Visit our store", text: address, href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` },
  phone && { icon: Phone, title: "Call us", text: phone, href: `tel:${phone}` },
  email && { icon: Mail, title: "Email us", text: email, href: `mailto:${email}` },
  hours && { icon: Clock3, title: "Store support", text: hours },
].filter(Boolean);

export default function ContactPage() {
  return (
    <><Header /><main className="overflow-hidden bg-cream text-ink">
      <section className="relative bg-ink py-20 text-white sm:py-24"><div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(232,189,109,0.3),transparent_42%)]" /><Reveal className="container-site relative text-center"><p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold-light">We’re Here to Help</p><h1 className="mt-4 font-serif text-5xl font-semibold sm:text-6xl">Contact Al Qirat Perfumes</h1><p className="mx-auto mt-5 max-w-2xl leading-8 text-stone-300">Questions about a product, delivery, or an existing order? Send us a message and our team will get back to you.</p></Reveal></section>
      <section className="container-site py-16 lg:py-24">{contactItems.length > 0 && <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{contactItems.map(({ icon: Icon, title, text, href }, index) => <Reveal key={title} delay={index * 70} from="zoom"><article className="h-full rounded-2xl border border-gold/20 bg-white p-5 shadow-sm"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cream text-gold-dark"><Icon size={20} /></span><h2 className="mt-4 font-bold">{title}</h2>{href ? <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined} className="mt-2 block text-sm leading-6 text-stone-500 hover:text-gold-dark">{text}</a> : <p className="mt-2 text-sm leading-6 text-stone-500">{text}</p>}</article></Reveal>)}</div>}
        <div className={`${contactItems.length ? "mt-10" : ""} grid overflow-hidden rounded-[30px] border border-stone-200 bg-white shadow-[0_25px_70px_-40px_rgba(21,16,12,0.5)] ${mapUrl ? "lg:grid-cols-[1fr_0.95fr]" : ""}`}><div className="p-6 sm:p-9 lg:p-11"><p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">Send a Query</p><h2 className="mt-3 font-serif text-4xl font-semibold">How can we help?</h2><p className="mt-3 text-sm leading-6 text-stone-500">Your query will appear directly in the admin panel for the Al Qirat team to review.</p><div className="mt-7"><ContactForm /></div></div>{mapUrl && <div className="min-h-[440px] border-t border-stone-200 lg:border-l lg:border-t-0"><iframe title="Al Qirat Perfumes location map" src={mapUrl} className="h-full min-h-[440px] w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen /></div>}</div>
        <StorefrontFaqs />
      </section>
    </main><Footer /></>
  );
}
