import { ArrowRight } from "lucide-react";
import Reveal from "../Reveal";
import SmartImage from "../SmartImage";
import Ornament from "./Ornament";

// Shows the first four categories from the database (managed in the admin dashboard).
function toCards(categories) {
  return (categories || []).slice(0, 4).map((category) => ({
    name: category.name,
    slug: category.slug,
    blurb: category.description || "",
    image: category.image_url,
  }));
}

export default function CategoryArches({ categories }) {
  const cards = toCards(categories);
  if (!cards.length) return null;
  return (
    <section className="bg-cream py-16 lg:py-20">
      <div className="container-site">
        <Reveal className="text-center">
          <h2 className="font-serif text-4xl font-semibold text-ink lg:text-5xl">Shop by Category</h2>
          <Ornament className="mt-3" />
          <p className="mt-3 text-sm text-ink/60">Discover our range crafted for every mood and occasion.</p>
        </Reveal>

        <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
          {cards.map((card, index) => (
            <Reveal key={card.slug} delay={index * 80} className="h-full">
              <a href={`/shop?category=${card.slug}`} className="group flex h-full flex-col">
                <SmartImage
                  src={card.image}
                  alt={card.name}
                  tone="from-sage to-cream"
                  imageKitTransform="f-auto,q-80,w-700"
                  className="aspect-[4/5] rounded-t-[999px] rounded-b-2xl shadow-[0_22px_40px_-26px_rgba(20,40,26,0.6)]"
                  imgClassName="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="flex flex-1 flex-col items-center px-2 pt-5 text-center">
                  <h3 className="font-serif text-2xl font-semibold text-ink">{card.name}</h3>
                  {card.blurb && <p className="mx-auto mt-1.5 max-w-[190px] pb-4 text-[12.5px] leading-snug text-ink/60">{card.blurb}</p>}
                  <span className="btn-forest mt-auto !px-5 !py-2.5 !text-[13px] group-hover:bg-ink">
                    Shop Now <ArrowRight size={14} />
                  </span>
                </div>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
