import Link from "next/link";
import { ScrollReveal } from "./ScrollReveal";
import { CONTAINER_CLASS } from "./container";
import { RulerTicks } from "./RulerTicks";

// Centered hero (spade.com's pattern — one column, no side-by-side split)
// on the sage "band" tone, bracketed by the ruler-tick rail on desktop. The
// before/after demo card sits below the fold copy, centered, rather than
// beside it — this is the "look like spade.com" pass; the previous
// two-column layout (matching a different reference, code-x.ai) is retired.
export function LandingHero() {
  return (
    <section className="relative bg-landing-band">
      <RulerTicks side="left" />
      <RulerTicks side="right" />

      <div
        className={`flex flex-col items-center py-20 text-center md:py-28 lg:py-36 ${CONTAINER_CLASS}`}
      >
        <p className="font-landing-mono text-xs font-medium tracking-[0.08em] text-accent uppercase sm:text-sm">
          Personal budgeting &amp; finance tracking app
        </p>
        <h1 className="font-landing-heading mt-5 max-w-4xl text-4xl font-semibold tracking-[-0.02em] text-foreground sm:text-6xl md:leading-[1.05] lg:text-7xl">
          Budgeting that adapts to how you earn
        </h1>
        <p className="mt-6 max-w-xl text-base text-foreground-muted sm:text-lg">
          Steward is a personal budgeting app that automatically categorizes your bank
          transactions and helps you track spending, income, and financial goals — whether your
          income is salaried, freelance, or your own business.
        </p>

        <Link
          href="/login"
          className="mt-8 inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-7 py-3 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
        >
          Get started free
        </Link>

        {/* The core value proof: a real raw bank line becoming a real
            Steward transaction row, styled exactly like the app's own
            transaction list and AI-insight card — not a generic
            before/after graphic. Staggered ScrollReveal (0/125/250ms) fires
            on initial load since the hero sits above the fold. */}
        <div className="mt-16 grid w-full max-w-2xl grid-cols-1 items-center gap-4 text-left sm:grid-cols-[1fr_auto_1fr]">
          <ScrollReveal>
            <div className="rounded-xl border border-card-border bg-card/60 p-4">
              <p className="font-landing-mono text-[11px] tracking-wide text-foreground-muted uppercase">
                Your bank statement
              </p>
              <p className="mt-2 font-mono text-sm text-foreground-muted">
                POS PURCHASE 4471 TIM HORTONS #2214 TORONTO ON
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delayMs={125}>
            <div
              aria-hidden="true"
              className="hidden justify-self-center text-2xl text-foreground-muted sm:block"
            >
              →
            </div>
          </ScrollReveal>

          <ScrollReveal delayMs={250}>
            <div className="rounded-xl bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-foreground">Tim Hortons</p>
                  <p className="text-xs text-foreground-muted">Dining Out</p>
                </div>
                <span className="font-bold text-critical">-$4.25</span>
              </div>
              <p className="mt-3 border-t border-card-border pt-3 font-editorial text-sm leading-relaxed text-foreground">
                Part of your usual weekly coffee pattern.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
