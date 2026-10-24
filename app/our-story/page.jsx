import { BadgeCheck, Clock3, Gem, Gift } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SmartImage from "@/components/SmartImage";
import Reveal from "@/components/Reveal";
import Ornament from "@/components/home/Ornament";
import CtaBand from "@/components/home/CtaBand";
import { brand } from "@/lib/brand";

export const metadata = {
  title: "Our Story | Al Qirat Perfumes",
  description: "Discover the story, values and craft behind Al Qirat Perfumes — the fragrance of luxury, the hallmark of refined taste.",
};

const values = [
  {
    icon: BadgeCheck,
    title: "Authentic Ingredients",
    text: "Every fragrance is made with carefully chosen ingredients, so quality and trust sit at the heart of the collection.",
  },
  {
    icon: Gem,
    title: "Premium Quality",
    text: "From the first note to the last, we look for lasting quality that feels special in everyday life.",
  },
  {
    icon: Clock3,
    title: "Long Lasting",
    text: "Concentrated extraits and traditional attars, made to stay with you from morning to night.",
  },
  {
    icon: Gift,
    title: "Made for Gifting",
    text: "Beautifully boxed sets that turn a fragrance into a memorable gift for someone special.",
  },
];

export default function OurStoryPage() {
  return (
    <>
      <Header />
      <main className="overflow-hidden bg-cream text-ink">
        <section className="relative isolate bg-sage-light">
          <SmartImage
            src="/images/home/story.jpg"
            alt=""
            tone="from-sage to-cream"
            className="absolute inset-0 -z-20"
            imgClassName="h-full w-full object-cover object-[78%_center]"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-sage-light via-sage-light/70 to-transparent md:via-sage-light/40" />

          <div className="container-site flex min-h-[460px] items-center py-20">
            <Reveal from="left" className="max-w-[560px]">
              <p className="text-[11px] font-medium uppercase tracking-[0.5em] text-ink/60">Our Story</p>
              <h1 className="mt-4 font-serif text-5xl font-semibold leading-[1.05] sm:text-6xl">
                More Than
                <br />
                a Fragrance
              </h1>
              <p className="mt-6 max-w-[460px] text-base leading-8 text-ink/75">
                {brand.legalName} began with a simple belief: a fragrance should say something about who you are, and be
                beautiful enough to be remembered.
              </p>
            </Reveal>
          </div>
        </section>

        <section className="container-site grid items-center gap-10 py-20 lg:grid-cols-2 lg:gap-16 lg:py-24">
          <Reveal from="left">
            <SmartImage
              src="/products/al-qirat/oud-al-qirat.jpg"
              alt="Oud Al Qirat extrait de parfum"
              tone="from-sage to-cream"
              className="aspect-square overflow-hidden rounded-[32px] shadow-[0_30px_70px_-34px_rgba(20,40,26,0.6)]"
              imgClassName="h-full w-full object-cover object-center"
            />
          </Reveal>

          <Reveal from="right">
            <p className="text-[11px] font-medium uppercase tracking-[0.5em] text-gold-dark">Where It Began</p>
            <h2 className="mt-4 font-serif text-4xl font-semibold leading-tight sm:text-5xl">
              A love for fragrance,
              <span className="block text-shimmer-dark">crafted with care</span>
            </h2>
            <div className="mt-6 space-y-5 text-base leading-8 text-ink/70">
              <p>
                Our journey started with a curated collection of imported perfumes and traditional attars: rich,
                long-lasting scents that carry memory, character and a sense of occasion.
              </p>
              <p>
                Today the collection brings together extrait de parfum, concentrated attars, gift sets and special
                editions, each selected to leave a lasting impression.
              </p>
            </div>
            <a href="/shop" className="btn-forest mt-8 !px-7">
              Explore the Collection
            </a>
          </Reveal>
        </section>

        <section className="bg-white py-20 lg:py-24">
          <div className="container-site">
            <Reveal className="mx-auto max-w-[700px] text-center">
              <p className="text-[11px] font-medium uppercase tracking-[0.5em] text-gold-dark">What Guides Us</p>
              <h2 className="mt-4 font-serif text-4xl font-semibold sm:text-5xl">Values behind every bottle</h2>
              <Ornament className="mt-4" />
            </Reveal>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {values.map(({ icon: Icon, title, text }, index) => (
                <Reveal key={title} delay={index * 90} from="zoom">
                  <article className="h-full rounded-3xl border border-gold/20 bg-cream p-6 shadow-[0_18px_45px_-34px_rgba(20,40,26,0.5)]">
                    <Icon size={36} strokeWidth={1.2} className="text-gold" />
                    <h3 className="mt-5 font-serif text-2xl font-semibold">{title}</h3>
                    <p className="mt-3 text-sm leading-7 text-ink/65">{text}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <CtaBand />
      </main>
      <Footer />
    </>
  );
}
