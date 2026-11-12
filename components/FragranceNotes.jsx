import { Droplets, Flower2, Sparkles } from "lucide-react";
import { readFragranceNotes } from "@/lib/fragranceNotes";

const groups = [
  { key: "top", label: "Top Notes", icon: Sparkles, description: "The first impression" },
  { key: "heart", label: "Heart Notes", icon: Flower2, description: "The fragrance character" },
  { key: "base", label: "Base Notes", icon: Droplets, description: "The lasting trail" },
];

export default function FragranceNotes({ notes }) {
  const normalizedNotes = readFragranceNotes(notes);
  const hasNotes = groups.some((group) => normalizedNotes[group.key].length > 0);
  if (!hasNotes) return null;

  return (
    <section aria-labelledby="fragrance-notes-title" className="mt-8 overflow-hidden rounded-3xl bg-ink px-5 py-6 text-cream shadow-[0_18px_40px_-28px_rgba(21,16,12,0.9)] sm:px-7 sm:py-7">
      <div className="flex items-end justify-between gap-4 border-b border-gold/25 pb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-gold-light">The composition</p>
          <h2 id="fragrance-notes-title" className="mt-2 font-serif text-2xl font-semibold sm:text-3xl">Fragrance Notes</h2>
        </div>
        <span aria-hidden="true" className="hidden h-px w-20 bg-gradient-to-r from-gold/0 via-gold to-gold/0 sm:block" />
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-3 md:gap-4">
        {groups.map(({ key, label, icon: Icon, description }) => (
          <div key={key} className="min-w-0">
            <div className="flex items-center gap-2 text-gold-light">
              <Icon size={15} strokeWidth={1.7} aria-hidden="true" />
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em]">{label}</h3>
            </div>
            <p className="mt-1 text-xs text-cream/60">{description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {normalizedNotes[key].map((note) => (
                <span key={note} className="max-w-full rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-xs leading-4 text-cream/90">
                  {note}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
