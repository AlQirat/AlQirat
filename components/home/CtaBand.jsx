import Reveal from "../Reveal";
import SmartImage from "../SmartImage";

export default function CtaBand() {
  return (
    <section className="relative isolate overflow-hidden bg-ink">
      <SmartImage
        src="/images/home/cta.jpg"
        alt=""
        tone="from-ink to-ink-soft"
        className="absolute inset-0 -z-20"
        imgClassName="h-full w-full object-cover object-[85%_center]"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/85 to-ink/20 md:from-30% md:via-ink/60 md:via-50% md:to-transparent md:to-80%" />

      <div className="container-site flex min-h-[300px] items-center py-14 lg:min-h-[340px]">
        <Reveal from="left" className="max-w-[460px]">
          <h2 className="font-serif text-4xl font-semibold leading-[1.1] text-cream lg:text-[48px]">
            A Touch of Luxury
            <br />
            for Every Moment
          </h2>
          <p className="mt-5 max-w-[380px] text-[14px] leading-relaxed text-stone-300">
            Explore our exclusive collection of perfumes and attars, crafted to make your presence memorable.
          </p>
          <a href="/shop" className="btn-gold mt-7 !px-7 !py-3 !text-sm">
            Shop Now
          </a>
        </Reveal>
      </div>
    </section>
  );
}
