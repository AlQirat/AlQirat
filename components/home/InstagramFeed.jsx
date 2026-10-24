import { FaInstagram } from "react-icons/fa";
import Reveal from "../Reveal";
import SmartImage from "../SmartImage";
import Ornament from "./Ornament";
import { brand } from "@/lib/brand";

// Static tiles linking to the brand's Instagram profile (a live feed would need the Instagram API).
const tiles = [
  { src: "/images/home/social-lavish-ice.jpg", alt: "Lavish Ice extrait de parfum" },
  { src: "/images/home/social-oud-al-qirat.jpg", alt: "Oud Al Qirat extrait de parfum" },
  { src: "/images/home/social-sandal-royale.jpg", alt: "Sandal Royale extrait de parfum" },
  { src: "/images/home/social-royal-oud-gift-set.jpg", alt: "Royal Oud gift set" },
  { src: "/images/home/social-gold-attar.jpg", alt: "Royal Gold Attar" },
  { src: "/images/home/social-signature-collection.jpg", alt: "The Al Qirat signature collection" },
];

export default function InstagramFeed() {
  const { instagram, instagramHandle } = brand.social;
  if (!instagram) return null;

  return (
    <section className="bg-cream py-16 lg:py-20">
      <div className="container-site">
        <Reveal className="text-center">
          <h2 className="font-serif text-4xl font-semibold text-ink lg:text-5xl">Join the {brand.shortName} Family</h2>
          <Ornament className="mt-3" />
          <a
            href={instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2.5 text-[15px] text-ink/70 transition hover:text-gold-dark"
          >
            <FaInstagram size={22} />
            {instagramHandle}
          </a>
        </Reveal>

        <div className="mt-10 grid grid-cols-3 gap-3 lg:grid-cols-6 lg:gap-4">
          {tiles.map((tile, index) => (
            <Reveal key={tile.src} delay={index * 60} from="zoom">
              <a
                href={instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${tile.alt} on Instagram`}
                className="group relative block overflow-hidden rounded-xl shadow-[0_16px_34px_-24px_rgba(20,40,26,0.6)]"
              >
                <SmartImage
                  src={tile.src}
                  alt={tile.alt}
                  tone="from-sage to-cream"
                  className="aspect-square"
                  imgClassName="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-ink/0 text-white opacity-0 transition duration-300 group-hover:bg-ink/45 group-hover:opacity-100">
                  <FaInstagram size={28} />
                </span>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
