import Link from "next/link";
import { ScrollReveal } from "./ScrollReveal";

export function LandingHero() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 pt-20 pb-8 text-center">
      <h1 className="text-4xl font-bold text-foreground sm:text-5xl">
        Budgeting that adapts to how you earn
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-base text-foreground-muted sm:text-lg">
        Steward turns messy bank data into clear, categorized transactions — and understands
        your income whether it&apos;s salaried, freelance, or your own business.
      </p>

      <Link
        href="/login"
        className="mt-8 inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-6 py-3 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
      >
        Get started free
      </Link>

      {/* The core value proof: a real raw bank line becoming a real Steward
          transaction row, styled exactly like the app's own transaction
          list and AI-insight card — not a generic before/after graphic.
          Staggered ScrollReveal (0/125/250ms) so the "after" card visibly
          follows the "before" card rather than both appearing at once —
          fires on initial load since the hero sits above the fold, same
          mechanism the below-the-fold sections use on scroll. */}
      <div className="mt-16 grid grid-cols-1 items-center gap-4 text-left sm:grid-cols-[1fr_auto_1fr]">
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

      <Link
        href="/login"
        className="mt-10 inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-6 py-3 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
      >
        Get started free
      </Link>
    </section>
  );
}
