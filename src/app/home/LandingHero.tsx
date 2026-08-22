import Link from "next/link";
import { ScrollReveal } from "./ScrollReveal";
import { CONTAINER_CLASS } from "./container";

export function LandingHero() {
  return (
    <section
      className={`grid grid-cols-1 items-center gap-12 py-16 md:grid-cols-[1fr_1.1fr] md:gap-16 md:py-24 ${CONTAINER_CLASS}`}
    >
      <div>
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">
          Personal budgeting &amp; finance tracking app
        </p>
        <h1 className="font-landing-heading mt-3 text-4xl font-extrabold tracking-[-0.028em] text-foreground sm:text-5xl md:text-6xl md:leading-[1.04]">
          Budgeting that adapts to how you earn
        </h1>
        <p className="mt-5 max-w-xl text-base text-foreground-muted sm:text-lg">
          Steward is a personal budgeting app that automatically categorizes your bank
          transactions and helps you track spending, income, and financial goals — whether your
          income is salaried, freelance, or your own business.
        </p>

        <Link
          href="/login"
          className="mt-8 inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-6 py-3 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
        >
          Get started free
        </Link>
      </div>

      {/* The core value proof: a real raw bank line becoming a real Steward
          transaction row, styled exactly like the app's own transaction
          list and AI-insight card — not a generic before/after graphic.
          Stacked vertically (not side-by-side like the old centered layout)
          since this now lives in its own narrower grid column rather than
          spanning the full page width. Staggered ScrollReveal (0/125/250ms)
          fires on initial load since the hero sits above the fold. */}
      <div className="flex flex-col gap-4">
        <ScrollReveal>
          <div className="rounded-xl border border-card-border bg-foreground/5 p-4">
            <p className="text-xs font-medium tracking-wide text-foreground-muted uppercase">
              Your bank statement
            </p>
            <p className="mt-2 font-mono text-sm text-foreground-muted">
              POS PURCHASE 4471 TIM HORTONS #2214 TORONTO ON
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delayMs={125}>
          <div aria-hidden="true" className="text-center text-2xl text-foreground-muted">
            ↓
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
    </section>
  );
}
