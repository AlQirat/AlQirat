"use client";

import { useEffect, useRef, useState } from "react";

const hidden = {
  up: "opacity-0 translate-y-10",
  left: "opacity-0 -translate-x-12",
  right: "opacity-0 translate-x-12",
  zoom: "opacity-0 scale-90",
};

// Fades/slides children in the first time they scroll into view.
export default function Reveal({
  children,
  from = "up",
  delay = 0,
  className = "",
}) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-[900ms] ease-[cubic-bezier(.2,.7,.2,1)] ${
        shown ? "translate-x-0 translate-y-0 scale-100 opacity-100" : hidden[from]
      } ${className}`}
    >
      {children}
    </div>
  );
}
