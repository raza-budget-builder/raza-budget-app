"use client";

import { useEffect, useState } from "react";
import { AiInsightIcon } from "../(app)/_components/icons";

// Split so the app name can carry its own italic styling as it reveals,
// rather than the whole line being one plain string.
const PREFIX = "Welcome to the ";
const APP_NAME = "Raza AI Budget Tool";
const SUFFIX = ".";
const LINE_ONE_LENGTH = PREFIX.length + APP_NAME.length + SUFFIX.length;

const LINE_TWO =
  "Understand your spending habits better and improve your lifestyle with the help of AI.";

const TOTAL_LENGTH = LINE_ONE_LENGTH + LINE_TWO.length;

// Same pacing as the Insights weekly narrative's typewriter reveal
// (NarrativeSummaryModule.tsx) — fast enough to feel brisk, slow enough to
// read as deliberate. Replays on every visit (no "already seen" tracking
// like that module has) since this is a one-line greeting, not content
// worth skipping on repeat.
const CHAR_DELAY_MS = 20;

function TypingCursor() {
  return (
    <span
      aria-hidden="true"
      className="ml-0.5 inline-block h-[1em] w-[2px] animate-[caret-blink_1s_step-end_infinite] translate-y-[3px] bg-foreground align-middle"
    />
  );
}

export function AiWelcomeMessage() {
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setRevealed((prev) => {
        if (prev >= TOTAL_LENGTH) {
          clearInterval(id);
          return prev;
        }
        return prev + 1;
      });
    }, CHAR_DELAY_MS);
    return () => clearInterval(id);
  }, []);

  const lineOneShown = Math.min(revealed, LINE_ONE_LENGTH);
  const lineTwoShown = Math.min(Math.max(0, revealed - LINE_ONE_LENGTH), LINE_TWO.length);
  const typingLineOne = lineOneShown < LINE_ONE_LENGTH;
  const typingLineTwo = !typingLineOne && lineTwoShown < LINE_TWO.length;

  const prefixShown = Math.min(lineOneShown, PREFIX.length);
  const appNameShown = Math.min(Math.max(0, lineOneShown - PREFIX.length), APP_NAME.length);
  const suffixShown = Math.min(
    Math.max(0, lineOneShown - PREFIX.length - APP_NAME.length),
    SUFFIX.length,
  );

  return (
    <div className="flex items-start gap-2">
      <AiInsightIcon className="mt-1 h-5 w-auto shrink-0" />
      <div aria-live="polite" className="min-w-0 flex-1 font-mono">
        {/* clamp() scales continuously with viewport width (not fixed
            breakpoint jumps) so the whole title reliably stays on one line
            from the smallest phone up through desktop, where the wider
            container (see page.tsx) lets it sit comfortably larger. */}
        <p className="overflow-hidden text-[clamp(0.8rem,3.8vw,1.5rem)] leading-snug font-bold whitespace-nowrap text-ellipsis text-foreground">
          {PREFIX.slice(0, prefixShown)}
          <span className="italic">{APP_NAME.slice(0, appNameShown)}</span>
          {SUFFIX.slice(0, suffixShown)}
          {typingLineOne && <TypingCursor />}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-foreground-muted">
          {LINE_TWO.slice(0, lineTwoShown)}
          {typingLineTwo && <TypingCursor />}
        </p>
      </div>
    </div>
  );
}
