import { Clock3, Gem, Gift, Leaf } from "lucide-react";
import Reveal from "../Reveal";

const features = [
  { icon: Gem, a: "Authentic", b: "Ingredients" },
  { icon: Leaf, a: "Premium", b: "Quality" },
  { icon: Clock3, a: "Long Lasting", b: "Fragrance" },
  { icon: Gift, a: "Ideal for", b: "Personal Use & Gifting" },
];

export default function FeatureStrip() {
  return (
    <section className="bg-cream py-12 lg:py-14">
      <div className="container-site grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
        {features.map(({ icon: Icon, a, b }, index) => (
          <Reveal key={a} delay={index * 80} from="zoom" className="flex flex-col items-center text-center">
            <Icon size={44} strokeWidth={1.1} className="text-gold" />
            <p className="mt-4 text-[14px] font-semibold text-ink">{a}</p>
            <p className="text-[13px] text-ink/60">{b}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
