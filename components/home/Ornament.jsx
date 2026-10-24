// Thin gold rule with a diamond in the middle, used under section headings.
export default function Ornament({ className = "" }) {
  return (
    <span aria-hidden="true" className={`flex items-center justify-center gap-2 ${className}`}>
      <span className="h-px w-10 bg-gold/60" />
      <span className="h-1.5 w-1.5 rotate-45 bg-gold" />
      <span className="h-px w-10 bg-gold/60" />
    </span>
  );
}
