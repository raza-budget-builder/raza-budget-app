import type { Metadata } from "next";
import Link from "next/link";
import { AiInsightIcon } from "../(app)/_components/icons";
import { ThemeToggle } from "../(app)/_components/ThemeToggle";
import { LandingHero } from "./LandingHero";
import { PersonaTabs } from "./PersonaTabs";
import { FeatureSections } from "./FeatureSections";
import { TestimonialsSection } from "./TestimonialsSection";
import { PricingSection } from "./PricingSection";
import { FinalCta } from "./FinalCta";
import { CONTAINER_CLASS } from "./container";

export const metadata: Metadata = {
  title: "Steward — AI-powered budgeting",
  description:
    "Steward is a personal budgeting and finance tracking app. It automatically categorizes your bank transactions and helps you track spending, income, and financial goals.",
};

// No theme override here (previously forced data-theme="dark") — this page
// now uses the exact same light-default, toggleable theme system as the
// rest of the app (root layout's THEME_INIT_SCRIPT + ThemeProvider), same
// as /login. The reused ThemeToggle below is the only thing that changes it.
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background font-landing-sans">
      <header className={`flex items-center justify-between py-6 ${CONTAINER_CLASS}`}>
        <div className="flex items-center gap-2">
          <AiInsightIcon className="h-5 w-auto" />
          <span className="font-landing-heading font-semibold tracking-[-0.01em] text-foreground">
            Steward
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="flex min-h-11 items-center rounded-full border border-card-border px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
          >
            Log in
          </Link>
        </div>
      </header>

      <LandingHero />
      <PersonaTabs />
      <FeatureSections />
      <TestimonialsSection />
      <PricingSection />
      <FinalCta />

      <footer
        className={`font-landing-mono py-8 text-center text-xs text-foreground-muted/80 ${CONTAINER_CLASS}`}
      >
        <Link href="/privacy-policy" className="hover:text-foreground">
          Privacy Policy
        </Link>
        {" · "}
        <Link href="/terms" className="hover:text-foreground">
          Terms of Service
        </Link>
      </footer>
    </div>
  );
}
