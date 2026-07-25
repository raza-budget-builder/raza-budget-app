"use client";

import { useEffect, useRef, useState, type TouchEvent } from "react";
import Link from "next/link";
import type { InsightSlide } from "@/lib/dashboard-insights";
import { AiInsightIcon, ChevronDownIcon } from "./icons";

const AUTO_ROTATE_MS = 7000;
// Generous enough for the icon row + a wrapped 3-line sentence + a button,
// so the tallest slide never clips. Fixed (not per-slide) because the roll
// transform below translates by this exact amount per step.
const SLIDE_HEIGHT = 128;
const SWIPE_THRESHOLD = 40;

export function InsightsCarousel({ slides }: { slides: InsightSlide[] }) {
  const [index, setIndex] = useState(0);
  const touchStartY = useRef<number | null>(null);

  // Restarts on every index change — manual or automatic — so a user
  // interaction always buys a full fresh interval instead of the next
  // auto-rotate landing right on top of it.
  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, AUTO_ROTATE_MS);
    return () => clearInterval(id);
  }, [index, slides.length]);

  if (slides.length === 0) return null;

  function goNext() {
    setIndex((i) => (i + 1) % slides.length);
  }
  function goPrev() {
    setIndex((i) => (i - 1 + slides.length) % slides.length);
  }

  function handleTouchStart(e: TouchEvent<HTMLElement>) {
    touchStartY.current = e.touches[0].clientY;
  }
  function handleTouchEnd(e: TouchEvent<HTMLElement>) {
    if (touchStartY.current === null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartY.current = null;
    if (Math.abs(deltaY) < SWIPE_THRESHOLD) return;
    // Swipe up (finger moves up, content rolls up) = next; swipe down = back.
    if (deltaY < 0) goNext();
    else goPrev();
  }

  return (
    <section
      className="relative mb-10 overflow-hidden rounded-2xl border border-card-border bg-card p-6"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="mb-3 flex items-center gap-2">
        <AiInsightIcon className="h-6 w-auto" />
        <h2 className="font-bold text-white">AI Insights</h2>
      </div>

      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 overflow-hidden" style={{ height: SLIDE_HEIGHT }}>
          <span className="sr-only">AI insight, rotating</span>
          <div
            aria-live="polite"
            className="transition-transform duration-700 ease-in-out"
            style={{ transform: `translateY(-${index * SLIDE_HEIGHT}px)` }}
          >
            {slides.map((slide, i) => (
              <div
                key={slide.id}
                aria-hidden={i !== index}
                style={{ height: SLIDE_HEIGHT }}
                className="flex flex-col justify-center"
              >
                <p className="font-editorial text-[15px] leading-relaxed text-white">
                  {slide.text}
                </p>
                {slide.action && (
                  <Link
                    href={slide.action.href}
                    className="mt-2 inline-flex w-fit items-center gap-1 rounded-full border border-card-border px-3 py-1.5 text-xs font-medium text-foreground-muted hover:bg-white/5 hover:text-white"
                  >
                    {slide.action.label} →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Desktop-only vertical nav: up arrow / dot stack / down arrow,
            stacked to match the roll direction (down arrow = next, since
            content rolls up and out to reveal the next slide from below). */}
        {slides.length > 1 && (
          <div
            className="hidden shrink-0 flex-col items-center sm:flex"
            style={{ height: SLIDE_HEIGHT }}
          >
            <button
              onClick={goPrev}
              aria-label="Previous insight"
              title="Previous"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-foreground-muted hover:bg-white/10 hover:text-white"
            >
              <ChevronDownIcon className="h-3 w-3" style={{ transform: "rotate(180deg)" }} />
            </button>

            <div className="flex flex-1 flex-col items-center justify-center gap-1">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  onClick={() => setIndex(i)}
                  aria-label={`Go to insight ${i + 1} of ${slides.length}`}
                  className="flex h-4 w-6 shrink-0 items-center justify-center"
                >
                  <span
                    className={`w-1 rounded-full transition-all duration-[250ms] ease-in-out ${
                      i === index ? "h-3 bg-white" : "h-1 bg-white/25"
                    }`}
                  />
                </button>
              ))}
            </div>

            <button
              onClick={goNext}
              aria-label="Next insight"
              title="Next"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-foreground-muted hover:bg-white/10 hover:text-white"
            >
              <ChevronDownIcon className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
