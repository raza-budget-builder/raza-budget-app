"use client";

import { useState } from "react";
import Link from "next/link";
import { ScrollReveal } from "./ScrollReveal";

type Persona = {
  key: string;
  label: string;
  headline: string;
  description: string;
  // Status token this persona's story is themed around — used only for a
  // faint background tint on its visual card (color-mix against --card,
  // same technique SummaryCard's hero uses), so each tab reads as visually
  // distinct without introducing any color outside the existing palette.
  tintVar: string;
};

const PERSONAS: Persona[] = [
  {
    key: "salaried",
    label: "Salaried",
    headline: "Know before it happens",
    description:
      "Track your budget goals and catch spending drift before it adds up — Steward flags changes early, in plain language.",
    tintVar: "--critical",
  },
  {
    key: "freelancer",
    label: "Freelancer",
    headline: "See your slow months coming",
    description:
      "Cash flow forecasting and slow-season awareness mean you're never caught off guard between invoices.",
    tintVar: "--attention",
  },
  {
    key: "business",
    label: "Small Business Owner",
    headline: "Built to grow with your business",
    description:
      "Business-tier tools for tracking revenue, expenses, and cash flow beyond personal budgeting.",
    tintVar: "--positive",
  },
  {
    key: "mixed",
    label: "Mixed Income",
    headline: "One place for every kind of income",
    description:
      "Salary, freelance gigs, business revenue — Steward brings it together without forcing it into one rigid budget.",
    tintVar: "--accent",
  },
];

// Illustrative, on-brand mockups (not real screenshots) — each reuses the
// app's own visual language (hairline separators, status colors, the
// editorial serif for AI-voice text) so they read as authentically Steward
// rather than generic marketing art.
function SalariedVisual() {
  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-bold text-foreground">Subscriptions</span>
          <span className="text-foreground-muted">$84 of $60 goal</span>
        </div>
        <div className="mt-1.5 h-2 rounded-full bg-foreground/10">
          <div className="h-2 w-full rounded-full bg-critical" />
        </div>
      </div>
      <p className="border-t border-card-border pt-3 font-editorial text-sm leading-relaxed text-foreground">
        Subscriptions is running 40% above your usual pace this month.
      </p>
    </div>
  );
}

function FreelancerVisual() {
  return (
    <div>
      <p className="text-xs font-medium text-foreground-muted">Projected balance, next 60 days</p>
      <svg viewBox="0 0 240 80" className="mt-3 w-full" aria-hidden="true">
        <polyline
          points="0,50 40,42 80,58 120,30 160,65 200,20 240,35"
          fill="none"
          stroke="var(--foreground)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1="0"
          y1="65"
          x2="240"
          y2="65"
          stroke="var(--attention)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      </svg>
      <p className="mt-2 font-editorial text-sm leading-relaxed text-foreground">
        Your balance may get tight around the 14th, based on known upcoming bills.
      </p>
    </div>
  );
}

function BusinessVisual() {
  const rows = [
    { label: "Business Revenue", value: "+$8,240", className: "text-positive" },
    { label: "Business Expenses", value: "-$3,110", className: "text-foreground-muted" },
    { label: "Net this month", value: "+$5,130", className: "text-positive" },
  ];
  return (
    <div className="space-y-2.5">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between text-sm">
          <span className="text-foreground-muted">{row.label}</span>
          <span className={`font-bold ${row.className}`}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function MixedVisual() {
  return (
    <div className="space-y-2.5">
      {[
        { label: "Salary", value: "$3,200", color: "bg-positive" },
        { label: "Freelance client work", value: "$1,450", color: "bg-accent" },
        { label: "Shop revenue", value: "$890", color: "bg-attention" },
      ].map((row) => (
        <div key={row.label} className="flex items-center gap-3 text-sm">
          <span className={`h-2 w-2 shrink-0 rounded-full ${row.color}`} />
          <span className="flex-1 text-foreground-muted">{row.label}</span>
          <span className="font-bold text-foreground">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

const VISUALS: Record<string, () => React.ReactElement> = {
  salaried: SalariedVisual,
  freelancer: FreelancerVisual,
  business: BusinessVisual,
  mixed: MixedVisual,
};

export function PersonaTabs() {
  const [active, setActive] = useState(PERSONAS[0].key);
  const persona = PERSONAS.find((p) => p.key === active) ?? PERSONAS[0];
  const Visual = VISUALS[persona.key];

  return (
    <ScrollReveal>
      <section className="mx-auto w-full max-w-4xl px-4 pt-8 pb-20">
        <p className="text-center text-sm font-medium text-foreground-muted">
          Built for how you actually earn
        </p>
        <h2 className="mt-2 text-center text-2xl font-bold text-foreground sm:text-3xl">
          One app, four kinds of income
        </h2>

        <div className="mt-8 flex flex-wrap justify-center gap-1 border-b border-card-border">
          {PERSONAS.map((p) => (
            <button
              key={p.key}
              onClick={() => setActive(p.key)}
              aria-pressed={active === p.key}
              className={`min-h-11 border-b-2 px-4 text-sm font-medium transition-colors ${
                active === p.key
                  ? "border-foreground text-foreground"
                  : "border-transparent text-foreground-muted hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* One bordered panel binding text + visual together as a single
            unit — the same "clearly paired" feel as the hero's before/after
            cards, rather than two columns floating independently. Keyed by
            persona so the fade+slide replays on every tab switch. */}
        <div
          key={persona.key}
          className="mt-10 animate-[fadeIn_350ms_ease-out] rounded-2xl border border-card-border p-6 sm:p-8"
        >
          <div className="grid gap-8 sm:grid-cols-2 sm:items-center">
            <div>
              <h3 className="text-xl font-bold text-foreground">{persona.headline}</h3>
              <p className="mt-3 text-sm leading-relaxed text-foreground-muted">
                {persona.description}
              </p>
              <Link
                href="/login"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
              >
                Get started free
              </Link>
            </div>
            <div
              className="rounded-xl p-5"
              style={{
                background: `color-mix(in srgb, var(${persona.tintVar}) 8%, var(--card))`,
              }}
            >
              <Visual />
            </div>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}
