"use client";

import { useEffect, useState, useTransition } from "react";
import { completeOnboarding, skipOnboarding } from "./actions";
import { INCOME_TYPES, INCOME_TYPE_LABEL, type IncomeType } from "@/lib/income-type";
import { ThemeToggle } from "../(app)/_components/ThemeToggle";

// Cycled in the goal placeholder so a short answer and a longer, more
// specific one both read as welcome — not a single fixed example nudging
// toward one style.
const GOAL_PLACEHOLDERS = [
  "Pay off my car loan by next year",
  "Save $500/month so I can retire in 20 years",
];
const PLACEHOLDER_ROTATE_MS = 3500;

// Only two tiers exist in this app (free/entrepreneur) — "business_owner"
// or "freelance" selections suggest the entrepreneur tier's business
// features are relevant; anything else (salaried-only, or nothing picked)
// stays on the free tier with no upsell. Labeled "Business" here rather
// than the raw tier name.
function recommendTier(incomeType: IncomeType[]): { tier: "entrepreneur"; label: string } | null {
  if (incomeType.includes("business_owner") || incomeType.includes("freelance")) {
    return { tier: "entrepreneur", label: "Business" };
  }
  return null;
}

const primaryButtonClass =
  "flex min-h-11 w-full items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50";
const secondaryButtonClass =
  "flex min-h-11 w-full items-center justify-center rounded-xl border border-card-border px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-foreground/5 hover:text-foreground disabled:opacity-50";

export function OnboardingFlow() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [incomeType, setIncomeType] = useState<IncomeType[]>([]);
  const [mainGoal, setMainGoal] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (step !== 2) return;
    const id = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % GOAL_PLACEHOLDERS.length);
    }, PLACEHOLDER_ROTATE_MS);
    return () => clearInterval(id);
  }, [step]);

  function toggleIncomeType(value: IncomeType) {
    setIncomeType((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  function handleSkip() {
    startTransition(() => {
      skipOnboarding();
    });
  }

  function handleFinish(acceptTier: boolean) {
    startTransition(() => {
      completeOnboarding({
        incomeType,
        mainGoal,
        acceptedTier: acceptTier ? (recommendation?.tier ?? null) : null,
      });
    });
  }

  const recommendation = recommendTier(incomeType);

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-4 bg-background px-4 py-16">
      <div className="absolute top-4 left-4">
        <ThemeToggle />
      </div>
      <button
        onClick={handleSkip}
        disabled={isPending}
        className="absolute top-4 right-4 -my-2 -mx-1 px-1 py-2 text-sm text-foreground-muted hover:text-foreground disabled:opacity-50"
      >
        Skip for now
      </button>

      <div className="w-full max-w-sm space-y-5 rounded-xl bg-card p-8 sm:max-w-md">
        <p className="text-xs font-medium text-foreground-muted">Step {step} of 3</p>

        {step === 1 && (
          <>
            <h1 className="text-lg font-bold text-foreground">How do you earn income?</h1>
            <div className="flex flex-wrap gap-2">
              {INCOME_TYPES.map((value) => (
                <button
                  key={value}
                  onClick={() => toggleIncomeType(value)}
                  aria-pressed={incomeType.includes(value)}
                  className={`flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-medium ${
                    incomeType.includes(value)
                      ? "bg-accent text-accent-foreground"
                      : "border border-card-border text-foreground-muted hover:bg-foreground/5 hover:text-foreground"
                  }`}
                >
                  {INCOME_TYPE_LABEL[value]}
                </button>
              ))}
            </div>
            <button onClick={() => setStep(2)} className={primaryButtonClass}>
              Continue
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-lg font-bold text-foreground">
              What&apos;s your financial goal right now?
            </h1>
            <textarea
              value={mainGoal}
              onChange={(e) => setMainGoal(e.target.value)}
              placeholder={GOAL_PLACEHOLDERS[placeholderIndex]}
              rows={3}
              className="w-full rounded-xl border border-card-border bg-input-bg px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted"
            />
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setStep(1)}
                className="-my-2 -mx-1 px-1 py-2 text-sm text-foreground-muted hover:text-foreground"
              >
                ← Back
              </button>
            </div>
            <button onClick={() => setStep(3)} className={primaryButtonClass}>
              Continue
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="text-lg font-bold text-foreground">You&apos;re all set</h1>
            {recommendation ? (
              <p className="text-sm text-foreground">
                Based on what you told us, we&apos;d suggest the{" "}
                <span className="font-bold">{recommendation.label}</span> plan — you can change
                this anytime in Profile.
              </p>
            ) : (
              <p className="text-sm text-foreground">
                The Free plan covers what you&apos;ve told us — you can change this anytime in
                Profile.
              </p>
            )}
            <div className="flex flex-col gap-2">
              {recommendation && (
                <button
                  onClick={() => handleFinish(true)}
                  disabled={isPending}
                  className={primaryButtonClass}
                >
                  Sounds good
                </button>
              )}
              <button
                onClick={() => handleFinish(false)}
                disabled={isPending}
                className={recommendation ? secondaryButtonClass : primaryButtonClass}
              >
                {recommendation ? "Skip / decide later" : "Finish"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
