import Link from "next/link";
import { ScrollReveal } from "./ScrollReveal";

export function FinalCta() {
  return (
    <ScrollReveal>
      <section className="mx-auto w-full max-w-2xl px-4 py-20 text-center">
        <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
          Budgeting that adapts to how you earn
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-foreground-muted sm:text-base">
          Free to start, whether you&apos;re salaried, freelance, or running your own business.
        </p>
        <Link
          href="/login"
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-6 py-3 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
        >
          Get started free
        </Link>
      </section>
    </ScrollReveal>
  );
}
