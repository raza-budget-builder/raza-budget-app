import Link from "next/link";
import { ScrollReveal } from "./ScrollReveal";
import { RulerTicks } from "./RulerTicks";

// Bookends the hero — same sage band + ruler-tick rail, so the page opens
// and closes on the same visual note.
export function FinalCta() {
  return (
    <ScrollReveal>
      <section className="relative bg-landing-band">
        <RulerTicks side="left" />
        <RulerTicks side="right" />
        <div className="mx-auto w-full max-w-3xl px-4 py-20 text-center sm:px-8">
          <h2 className="font-landing-heading text-3xl font-semibold tracking-[-0.01em] text-foreground sm:text-5xl">
            Budgeting that adapts to how you earn
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-foreground-muted sm:text-base">
            Free to start, whether you&apos;re salaried, freelance, or running your own business.
          </p>
          <Link
            href="/login"
            className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
          >
            Get started free
          </Link>
        </div>
      </section>
    </ScrollReveal>
  );
}
