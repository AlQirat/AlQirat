"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useStorefrontContent } from "./useStorefrontData";

export default function StorefrontFaqs() {
  const { data, error } = useStorefrontContent();
  const [openId, setOpenId] = useState(null);
  if (!data.faqs.length && !error) return null;
  return <section className="mt-14"><div className="mx-auto max-w-4xl text-center"><p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-dark">Helpful answers</p><h2 className="mt-3 font-serif text-4xl font-semibold">Frequently Asked Questions</h2></div>{error && <p role="alert" className="mx-auto mt-5 max-w-4xl rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">FAQ synchronization failed: {error}</p>}<div className="mx-auto mt-8 max-w-4xl divide-y overflow-hidden rounded-3xl border border-gold/20 bg-white shadow-sm">{data.faqs.map((faq) => <article key={faq.id}><button type="button" onClick={() => setOpenId((current) => current === faq.id ? null : faq.id)} className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left font-semibold sm:px-7"><span>{faq.question}</span><ChevronDown size={18} className={`shrink-0 transition ${openId === faq.id ? "rotate-180" : ""}`} /></button>{openId === faq.id && <p className="px-5 pb-6 text-sm leading-7 text-stone-600 sm:px-7">{faq.answer}</p>}</article>)}</div></section>;
}
