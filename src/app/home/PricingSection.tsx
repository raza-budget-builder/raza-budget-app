import Link from "next/link";
import { ScrollReveal } from "./ScrollReveal";

// Forward-looking marketing copy for a 3-tier structure — none of the
// enforcement (daily usage limits, tier-gating on goals/recurring) exists
// in the app yet; this is deliberately scoped to landing-page copy only for
// now (confirmed with the user). Starter's limits are restrictions, not
// promises, so there's no accuracy risk in listing them ahead of
// enforcement. "(coming soon)" is reserved for paid-tier features that
// don't exist in the app at all yet (multi-account tracking, export) —
// unlike recurring/goal tracking, which is real and already built, just
// not tier-gated yet.
const TIERS = [
  {
    name: "Starter",
    price: "$0",
    cadence: "forever",
    features: [
      "1 upload per day (CSV or receipt)",
      "2 AI chat messages per day",
      "Limited AI insights",
      "Budget dashboard basics",
    ],
    cta: "Get started free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$9",
    cadence: "/month",
    features: [
      "Unlimited uploads",
      "Unlimited AI chat assistant",
      "Full AI insights suite",
      "Recurring & goal tracking",
    ],
    cta: "Sign up",
    highlight: true,
  },
  {
    name: "Business",
    price: "$19",
    cadence: "/month",
    features: [
      "Everything in Pro",
      "Multi-account & business tracking (coming soon)",
      "Priority support",
      "Export reports — CSV/PDF (coming soon)",
    ],
    cta: "Sign up",
    highlight: false,
  },
];

export function PricingSection() {
  return (
    <ScrollReveal>
      <section className="mx-auto w-full max-w-5xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
          Simple pricing
        </h2>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl p-6 ${
                tier.highlight
                  ? "border-2 border-accent"
                  : "border border-card-border"
              }`}
            >
              <p className="text-sm font-medium text-foreground-muted">{tier.name}</p>
              <p className="mt-1 text-3xl font-bold text-foreground">
                {tier.price}
                <span className="text-sm font-normal text-foreground-muted"> {tier.cadence}</span>
              </p>
              <ul className="mt-5 space-y-2.5 text-sm text-foreground-muted">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span aria-hidden="true" className="mt-0.5 text-positive">
                      ✓
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className={`mt-6 flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-medium ${
                  tier.highlight
                    ? "bg-accent text-accent-foreground hover:bg-accent-hover"
                    : "border border-card-border text-foreground hover:bg-foreground/5"
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}
