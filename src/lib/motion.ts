import type { CSSProperties } from "react";

// Shared motion primitives so every interactive control in the app presses
// and settles the same way, instead of each component inventing its own
// timing. Kept as plain Tailwind class strings (not a custom CSS class) to
// match this codebase's convention of spelling styles out inline.

// Press feedback for any tappable control (buttons, and links styled as
// buttons) — a fast, subtle scale-down on press/hold, back on release.
// duration-150 + ease-out per the "fast, Apple-like" brief: quick to
// respond, never lingering. motion-reduce: turns it into a no-op for
// anyone who's asked their OS for less motion.
export const TAP_FEEDBACK =
  "transition-transform duration-150 ease-out active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100";

// Staggered entrance for a list of rows/cards appearing together (e.g. the
// Dashboard's "Last 7 days" and "Upcoming" lists) — each item fades and
// slides up slightly, offset by a few ms per index so they settle in one
// quick wave rather than popping in all at once. Capped so a long list
// doesn't keep visibly staggering in past the point it reads as "loading
// slowly" — every row is done animating well under a second, regardless of
// list length.
//
// `baseMs` lets a list nested inside its own already-animating section
// start a beat after that section does — opacity is multiplicative across
// nested elements, so a list item fading in from t=0 while its ancestor is
// still mid-fade reads as muddy/delayed rather than crisp. Pass
// nestedListBaseMs(sectionIndex) as baseMs when nesting inside a
// sectionDelay'd container; omit it for a list that isn't nested.
const STAGGER_STEP_MS = 20;
const STAGGER_MAX_STEPS = 6;

export function staggerDelay(index: number, baseMs = 0): CSSProperties {
  return { animationDelay: `${baseMs + Math.min(index, STAGGER_MAX_STEPS) * STAGGER_STEP_MS}ms` };
}

// Same idea for a handful of major page sections (Dashboard's Summary /
// Insights / Charts / lists) settling in as one orchestrated sequence on
// load — sections overlap their fades rather than waiting for one another
// to fully finish (that would make a 5-section page take over a second to
// finish loading in), so this step is deliberately small.
const SECTION_STEP_MS = 40;

export function sectionDelay(index: number): CSSProperties {
  return { animationDelay: `${index * SECTION_STEP_MS}ms` };
}

// A nested list only needs a head start into its section's own fade, not
// to wait for it to fully complete — by roughly the halfway point of an
// ease-out fade the section already reads as most of the way there, which
// is enough to keep a list item fading in on top of it from looking muddy,
// without stacking up the total time-to-settle the way waiting for the
// full duration would.
const NESTED_LIST_OVERLAP_MS = 120;

export function nestedListBaseMs(sectionIndex: number): number {
  return sectionIndex * SECTION_STEP_MS + NESTED_LIST_OVERLAP_MS;
}

// Reuses globals.css's existing `stepIn` keyframe (fade + slight rise) —
// `both` fill mode holds the pre-animation (invisible) state until the
// delay above elapses, so staggered items don't flash fully visible before
// their turn. 240ms keeps it snappy — comfortably inside the 150-300ms
// range every animation in the app should land in.
export const ENTRANCE_ANIMATION = "animate-[stepIn_240ms_ease-out_both]";
