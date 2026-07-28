import Link from "next/link";
import { InsightCard } from "../(app)/_components/InsightCard";
import { ScrollReveal } from "./ScrollReveal";

type Feature = {
  key: string;
  eyebrow: string;
  headline: string;
  description: string;
  tintVar: string;
  reverse: boolean;
};

const FEATURES: Feature[] = [
  {
    key: "insights",
    eyebrow: "AI Insights",
    headline: "Insights that actually say something",
    description:
      "Weekly summaries, drift alerts, and goal check-ins — written in plain language, not just numbers on a dashboard.",
    tintVar: "--accent",
    reverse: false,
  },
  {
    key: "forecast",
    eyebrow: "Cash Flow Forecast",
    headline: "See what's coming before it hits your account",
    description:
      "A 60-day forward projection based on your known bills and income, so you're never caught off guard.",
    tintVar: "--attention",
    reverse: true,
  },
  {
    key: "import",
    eyebrow: "Smart CSV Import",
    headline: "Upload once, done",
    description:
      "Steward reads your bank export, matches merchants, and sorts everything into categories automatically.",
    tintVar: "--positive",
    reverse: false,
  },
  {
    key: "goals",
    eyebrow: "Goals",
    headline: "Set it, track it, forget the spreadsheet",
    description:
      "Set a monthly cap on any category and Steward tracks your progress automatically — no manual math.",
    tintVar: "--pending",
    reverse: true,
  },
];

function InsightsVisual() {
  return (
    <InsightCard>
      You&apos;ve spent 18% less on Dining Out this week than your 3-month average — nice
      consistency.
    </InsightCard>
  );
}

function ForecastVisual() {
  return (
    <div className="rounded-xl bg-card p-5">
      <p className="text-xs font-medium text-foreground-muted">Projected balance, next 60 days</p>
      <svg viewBox="0 0 320 100" className="mt-3 w-full" aria-hidden="true">
        <polyline
          points="0,60 45,55 90,62 135,45 180,50 225,35 270,40 320,28"
          fill="none"
          stroke="var(--foreground)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line x1="0" y1="80" x2="320" y2="80" stroke="var(--card-border)" strokeWidth="1" strokeDasharray="4 4" />
        <text x="0" y="94" fill="var(--foreground-muted)" fontSize="9">
          $0
        </text>
      </svg>
      <p className="mt-2 font-editorial text-sm leading-relaxed text-foreground">
        Your balance is projected to stay above $2,100 over the next 60 days, based on known
        bills.
      </p>
    </div>
  );
}

function ImportVisual() {
  return (
    <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
      <div className="rounded-xl border border-card-border bg-foreground/5 p-4">
        <p className="text-xs font-medium tracking-wide text-foreground-muted uppercase">
          Bank export
        </p>
        <div className="mt-2 space-y-1.5 font-mono text-xs text-foreground-muted">
          <p>PAYROLL DEP ACME CORP</p>
          <p>POS PURCHASE 8832 SHOPPERS DRUG MART</p>
        </div>
      </div>
      <div aria-hidden="true" className="hidden justify-self-center text-2xl text-foreground-muted sm:block">
        →
      </div>
      <div className="space-y-3 rounded-xl bg-card p-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <div className="min-w-0">
            <p className="truncate font-bold text-foreground">Acme Corp</p>
            <p className="text-xs text-foreground-muted">Salary</p>
          </div>
          <span className="shrink-0 font-bold text-positive">+$2,450.00</span>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-card-border pt-3 text-sm">
          <div className="min-w-0">
            <p className="truncate font-bold text-foreground">Shoppers Drug Mart</p>
            <p className="text-xs text-foreground-muted">Health &amp; Medical</p>
          </div>
          <span className="shrink-0 font-bold text-critical">-$18.42</span>
        </div>
      </div>
    </div>
  );
}

function GoalsVisual() {
  const goals = [
    { label: "Groceries", spent: 340, cap: 450 },
    { label: "Entertainment", spent: 60, cap: 100 },
  ];
  return (
    <div className="space-y-4 rounded-xl bg-card p-5">
      {goals.map((g) => {
        const percent = Math.round((g.spent / g.cap) * 100);
        return (
          <div key={g.label}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-bold text-foreground">{g.label}</span>
              <span className="text-foreground-muted">
                ${g.spent} of ${g.cap} ({percent}%)
              </span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-foreground/10">
              <div className="h-2 rounded-full bg-positive" style={{ width: `${percent}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const VISUALS: Record<string, () => React.ReactElement> = {
  insights: InsightsVisual,
  forecast: ForecastVisual,
  import: ImportVisual,
  goals: GoalsVisual,
};

export function FeatureSections() {
  return (
    <>
      {FEATURES.map((feature) => {
        const Visual = VISUALS[feature.key];
        return (
          <ScrollReveal key={feature.key}>
            <section className="mx-auto w-full max-w-5xl px-4 py-14">
              <div className="grid items-center gap-10 sm:grid-cols-2">
                <div className={feature.reverse ? "sm:order-2" : "sm:order-1"}>
                  <p className="text-sm font-medium text-foreground-muted">{feature.eyebrow}</p>
                  <h2 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
                    {feature.headline}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-foreground-muted">
                    {feature.description}
                  </p>
                  <Link
                    href="/login"
                    className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
                  >
                    Get started free
                  </Link>
                </div>
                <div
                  className={`rounded-2xl p-2 sm:p-4 ${feature.reverse ? "sm:order-1" : "sm:order-2"}`}
                  style={{
                    background: `color-mix(in srgb, var(${feature.tintVar}) 8%, var(--background))`,
                  }}
                >
                  <Visual />
                </div>
              </div>
            </section>
          </ScrollReveal>
        );
      })}
    </>
  );
}
