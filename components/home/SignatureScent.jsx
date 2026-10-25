"use client";

import Reveal from "../Reveal";
import SmartImage from "../SmartImage";
import Ornament from "./Ornament";
import { useScentData } from "../useScentData";
import { SCENT_DISCLAIMER } from "@/lib/customPerfume.mjs";

export default function SignatureScent() {
  const { data, error } = useScentData("/api/custom-perfume/settings");
  if (error || !data?.enabled || !data.homepage_enabled) return null;
  return (
    <section aria-labelledby="signature-title" className="bg-sage-light py-16 lg:py-24">
      <div className="container-site grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal from="left">
          <SmartImage src="/images/home/story.jpg" alt="A carefully composed Al Qirat fragrance" className="aspect-[4/3] rounded-t-[120px] rounded-b-3xl shadow-xl sm:rounded-t-[180px]" imgClassName="h-full w-full object-cover object-[100%_center]" />
        </Reveal>
        <Reveal from="right" className="text-center lg:text-left">
          <p className="text-xs font-medium uppercase tracking-[0.35em] text-gold-dark">Made personal. Made for you.</p>
          <h2 id="signature-title" className="mt-4 font-serif text-4xl font-semibold leading-tight text-ink sm:text-5xl">Create Your<br />Signature Scent</h2>
          <Ornament className="my-5" />
          <p className="text-base leading-8 text-ink/75">A favourite note. A treasured memory. A fragrance you love. Share your inspiration and let us explore a scent profile that feels uniquely yours.</p>
          <ol className="my-7 grid grid-cols-3 gap-3 text-center text-xs text-ink/75">
            {["Share your inspiration", "Receive a personal quotation", "Shape your signature"].map((step, index) => <li key={step}><span className="mb-2 block font-serif text-2xl text-gold-dark">0{index + 1}</span>{step}</li>)}
          </ol>
          <a href="/custom-perfume" className="btn-forest text-center">Customize Your Perfume</a>
          <p className="mt-5 text-xs leading-6 text-ink/60">{SCENT_DISCLAIMER}</p>
        </Reveal>
      </div>
    </section>
  );
}
