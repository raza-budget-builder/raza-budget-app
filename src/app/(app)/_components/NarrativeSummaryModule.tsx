"use client";

import { useEffect, useRef, useState } from "react";
import type { WeeklyNarrativeSummary } from "@/lib/weekly-summary";
import { AiInsightIcon } from "./icons";

// Fast enough to feel brisk rather than sluggish, slow enough to read as a
// deliberate "typing" reveal rather than a flicker.
const CHAR_DELAY_MS = 20;

// Single "last animated" pointer, not a set — only one narrative summary is
// ever shown at a time, so remembering the most recent generatedAt is
// enough to know whether *this* one has already played for this browser.
const SEEN_STORAGE_KEY = "nsm:lastAnimatedGeneratedAt";

function formatDateRangeLabel(startISO: string, endISO: string) {
  const start = new Date(`${startISO}T00:00:00`);
  const end = new Date(`${endISO}T00:00:00`);

  // Always include the month on both ends rather than eliding a repeated one —
  // Intl.DateTimeFormat has no stable pattern for {day, year} without a month.
  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return `${startLabel} – ${endLabel}, ${end.getFullYear()}`;
}

function TypingCursor() {
  return (
    <span
      aria-hidden="true"
      className="ml-0.5 inline-block h-[1em] w-[2px] animate-[caret-blink_1s_step-end_infinite] translate-y-[3px] bg-foreground align-middle"
    />
  );
}

export function NarrativeSummaryModule({ data }: { data: WeeklyNarrativeSummary }) {
  const rangeLabel = formatDateRangeLabel(data.weekStart, data.weekEnd);
  const summaryText = data.summary ?? "";
  const tipText = data.tip ?? "";
  const hasContent = Boolean(data.summary && data.tip);
  const totalLength = summaryText.length + tipText.length;

  // "idle" = pre-hydration/no content, "typing" = reveal in progress,
  // "done" = full text showing, no cursor.
  const [phase, setPhase] = useState<"idle" | "typing" | "done">("idle");
  const [revealed, setRevealed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!hasContent || totalLength === 0) return;

    // Reading localStorage and kicking off the reveal both happen inside this
    // deferred callback (never directly in the effect body) — the check is
    // browser-only anyway, and deferring it avoids a same-tick render churn
    // on mount.
    const startId = setTimeout(() => {
      let alreadySeen = false;
      try {
        alreadySeen =
          data.generatedAt != null &&
          window.localStorage.getItem(SEEN_STORAGE_KEY) === data.generatedAt;
      } catch {
        // localStorage unavailable (private browsing etc.) — default to animating.
      }

      if (alreadySeen) {
        setRevealed(totalLength);
        setPhase("done");
        return;
      }

      setRevealed(0);
      setPhase("typing");
      intervalRef.current = setInterval(() => {
        setRevealed((prev) => {
          const next = prev + 1;
          if (next >= totalLength) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            markSeen();
            setPhase("done");
          }
          return next;
        });
      }, CHAR_DELAY_MS);
    }, 0);

    return () => {
      clearTimeout(startId);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.generatedAt, hasContent, totalLength]);

  function markSeen() {
    try {
      if (data.generatedAt) window.localStorage.setItem(SEEN_STORAGE_KEY, data.generatedAt);
    } catch {
      // Ignore — worst case it re-animates once more next time.
    }
  }

  function handleSkip() {
    if (phase !== "typing") return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRevealed(totalLength);
    markSeen();
    setPhase("done");
  }

  const summaryShown = Math.min(revealed, summaryText.length);
  const tipShown = Math.max(0, Math.min(revealed - summaryText.length, tipText.length));
  const typingSummary = phase === "typing" && summaryShown < summaryText.length;
  const typingTip = phase === "typing" && !typingSummary && tipShown < tipText.length;

  return (
    <section className="mb-10 rounded-2xl border border-card-border bg-card px-8 py-7">
      <div className="flex items-center gap-2">
        <AiInsightIcon className="h-4 w-auto" />
        <h2 className="font-bold text-foreground">Your Weekly AI Financial Summary</h2>
      </div>
      <p className="mt-1 text-xs text-foreground-muted">{rangeLabel}</p>

      {hasContent ? (
        <>
          {/* Full text, present immediately for assistive tech — independent
              of the animated reveal below, which is aria-hidden. */}
          <div className="sr-only">
            <p>{data.summary}</p>
            <p>This week&apos;s tip: {data.tip}</p>
          </div>

          <div
            aria-hidden="true"
            onClick={handleSkip}
            className={phase === "typing" ? "cursor-pointer" : ""}
          >
            <p className="font-editorial mt-3 text-[15px] leading-relaxed text-foreground">
              {summaryText.slice(0, summaryShown)}
              {typingSummary && <TypingCursor />}
            </p>

            <div className="mt-6 border-t border-card-border pt-5">
              <p className="text-xs font-medium tracking-wide text-foreground-muted uppercase">
                This week&apos;s tip
              </p>
              <p className="font-editorial mt-2 text-[15px] leading-relaxed text-foreground">
                {tipText.slice(0, tipShown)}
                {typingTip && <TypingCursor />}
              </p>
            </div>
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-foreground-muted">
          Add a few transactions this week to get a summary.
        </p>
      )}
    </section>
  );
}
