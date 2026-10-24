// Floating gold dust, pure CSS. Fixed positions so server/client markup matches.
const dots = [
  { l: "8%", b: "12%", s: 5, d: 0 },
  { l: "18%", b: "30%", s: 3, d: 2 },
  { l: "30%", b: "8%", s: 4, d: 4 },
  { l: "42%", b: "40%", s: 3, d: 1 },
  { l: "55%", b: "15%", s: 6, d: 3 },
  { l: "64%", b: "35%", s: 4, d: 5 },
  { l: "74%", b: "10%", s: 3, d: 2.5 },
  { l: "83%", b: "28%", s: 5, d: 0.5 },
  { l: "91%", b: "18%", s: 4, d: 3.5 },
  { l: "48%", b: "5%", s: 3, d: 6 },
];

export default function Particles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {dots.map((p, i) => (
        <span
          key={i}
          className="absolute animate-rise rounded-full bg-gold-light opacity-0 shadow-[0_0_12px_3px_rgba(232,189,109,0.7)]"
          style={{
            left: p.l,
            bottom: p.b,
            width: p.s,
            height: p.s,
            animationDelay: `${p.d}s`,
          }}
        />
      ))}
    </div>
  );
}
