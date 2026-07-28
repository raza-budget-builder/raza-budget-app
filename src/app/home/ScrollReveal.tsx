"use client";

import { useEffect, useRef, useState } from "react";

// Reusable "fade + slide up" reveal for below-the-fold content — fires once
// via IntersectionObserver (disconnects after the first reveal, so it
// doesn't flicker in/out as the user scrolls past a section repeatedly) and
// stays revealed. Not used for above-the-fold content (the hero's headline)
// since delaying the first thing a visitor sees would feel slow, not alive.
export function ScrollReveal({
  children,
  className,
  delayMs = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delayMs}ms` }}
      className={`transition-all duration-[400ms] ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      } ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
