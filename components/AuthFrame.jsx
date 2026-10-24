import { Check } from "lucide-react";
import Header from "./Header";
import Footer from "./Footer";
import SmartImage from "./SmartImage";
import { brand } from "@/lib/brand";

const benefits = ["Track your orders in one place", "Save your delivery address", "Faster, easier checkout"];

// Shared page shell for login, register and password reset: site header, a branded side panel
// (large screens), the form card, and the site footer.
export default function AuthFrame({ eyebrow, title, description, children, footer }) {
  return (
    <>
      <Header />
      <main className="relative overflow-hidden bg-cream text-ink">
        <div className="pointer-events-none absolute -left-32 top-10 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(220,229,208,0.9),transparent_68%)]" />
        <div className="pointer-events-none absolute -right-32 bottom-0 h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(201,154,75,0.16),transparent_68%)]" />

        <div className="container-site relative py-10 sm:py-14 lg:py-20">
          <div className="mx-auto grid max-w-[1080px] overflow-hidden rounded-[32px] bg-white shadow-[0_40px_90px_-48px_rgba(20,40,26,0.55)] ring-1 ring-black/[0.04] lg:grid-cols-[0.95fr_1.05fr]">
            <aside className="relative hidden min-h-[640px] lg:block">
              <SmartImage
                src="/images/home/hero-mobile.jpg"
                alt=""
                tone="from-sage to-cream"
                className="absolute inset-0"
                imgClassName="h-full w-full object-cover object-[60%_top]"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-ink/90 via-ink/55 via-45% to-transparent to-70%" />
              <div className="absolute inset-x-0 top-0 p-10 text-cream">
                <p className="text-[11px] font-medium uppercase tracking-[0.45em] text-gold-light">{brand.shortName}</p>
                <p className="mt-3 font-serif text-4xl font-semibold leading-[1.1]">{brand.tagline}</p>
                <ul className="mt-6 space-y-3 text-sm text-stone-200">
                  {benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold/90 text-ink">
                        <Check size={14} strokeWidth={3} />
                      </span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>

            <section className="px-6 py-10 sm:px-12 sm:py-14 lg:px-14">
              <div className="mx-auto max-w-[440px]">
                <p className="text-[11px] font-medium uppercase tracking-[0.4em] text-gold-dark">{eyebrow}</p>
                <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight sm:text-[44px]">{title}</h1>
                <div className="mt-4 flex items-center gap-2" aria-hidden="true">
                  <span className="h-px w-10 bg-gold/70" />
                  <span className="h-1.5 w-1.5 rotate-45 bg-gold" />
                </div>
                <p className="mt-4 text-sm leading-6 text-ink/65">{description}</p>

                <div className="mt-8">{children}</div>
                {footer && <div className="mt-8 border-t border-stone-100 pt-6 text-center text-sm text-ink/65">{footer}</div>}
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
