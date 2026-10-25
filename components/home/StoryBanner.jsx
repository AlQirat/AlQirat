import Reveal from "../Reveal";
import SmartImage from "../SmartImage";
import { brand } from "@/lib/brand";

export default function StoryBanner() {
  return (
    <section className="relative isolate overflow-hidden bg-sage-light">
      <SmartImage
        src="/images/home/story.jpg"
        alt=""
        tone="from-sage to-cream"
        className="absolute inset-0 -z-20"
        imgClassName="h-full w-full object-cover object-[78%_center]"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-sage-light via-sage-light/70 to-transparent md:via-sage-light/40" />

      <div className="container-site flex min-h-[340px] items-center py-14 lg:min-h-[400px]">
        <Reveal from="left" className="max-w-[460px]">
          <p className="text-[11px] font-medium uppercase tracking-[0.5em] text-ink/60">Our Story</p>
          <h2 className="mt-4 font-serif text-4xl font-semibold leading-[1.08] text-ink lg:text-[54px]">
            More Than
            <br />
            a Fragrance
          </h2>
          <p className="mt-5 max-w-[400px] text-[14.5px] leading-relaxed text-ink/75">
            At {brand.legalName}, we bring you fragrances that reflect heritage, elegance and modern sophistication. Each
            scent is carefully selected to leave a lasting impression.
          </p>
          <a href="/about" className="btn-forest mt-7 !px-6 !py-3">
            Our Story
          </a>
        </Reveal>
      </div>
    </section>
  );
}
