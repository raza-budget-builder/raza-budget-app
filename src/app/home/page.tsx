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

export const metadata: Metadata = {
  title: "Steward — AI-powered budgeting",
  description:
    "Budgeting that adapts to how you earn. Steward turns messy bank data into clear, categorized transactions.",
};

// No theme override here (previously forced data-theme="dark") — this page
// now uses the exact same light-default, toggleable theme system as the
// rest of the app (root layout's THEME_INIT_SCRIPT + ThemeProvider), same
// as /login. The reused ThemeToggle below is the only thing that changes it.
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-6">
        <div className="flex items-center gap-2">
          <AiInsightIcon className="h-5 w-auto" />
          <span className="font-bold text-foreground">Steward</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link href="/login" className="text-sm text-foreground-muted hover:text-foreground">
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

      <footer className="mx-auto w-full max-w-5xl px-4 py-8 text-center text-xs text-foreground-muted/80">
        <Link href="/privacy" className="hover:text-foreground">
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
