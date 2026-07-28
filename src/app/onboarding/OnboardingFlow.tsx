"use client";

import { useEffect, useState, useTransition } from "react";
import { completeOnboarding, skipOnboarding } from "./actions";
import { type IncomeType } from "@/lib/income-type";
import { GOAL_OPTIONS, type GoalOption } from "@/lib/goal-options";
import { ThemeToggle } from "../(app)/_components/ThemeToggle";

// Emoji pairing is onboarding-only — Profile's plain-text income pills
// (IncomeTypeFields.tsx) stay as they are, so this stays local rather than
// living on the shared lib/income-type.ts source of truth.
const INCOME_TYPE_OPTIONS: { value: IncomeType; label: string; emoji: string }[] = [
  { value: "salaried", label: "Salaried / employed", emoji: "💼" },
  { value: "freelance", label: "Freelance / self-employed", emoji: "🎨" },
  { value: "business_owner", label: "Small business owner", emoji: "🏪" },
  { value: "mixed", label: "Mixed (salary + side income)", emoji: "🔀" },
  { value: "other", label: "Other", emoji: "🌱" },
];

// Cycled in the goal detail placeholder so a short answer and a longer, more
// specific one both read as welcome — not a single fixed example nudging
// toward one style.
const GOAL_PLACEHOLDERS = [
  "Pay off my car loan by next year",
  "Save $500/month toward retirement",
];
const PLACEHOLDER_ROTATE_MS = 3500;

const TOTAL_STEPS = 4;

// Only two tiers exist in this app (free/entrepreneur) — "business_owner",
// "freelance", or "mixed" selections suggest the entrepreneur tier's
// business features are relevant; salaried-only or "other" stays free with
// no upsell. Labeled "Business" here rather than the raw tier name.
function recommendTier(incomeType: IncomeType[]): { tier: "entrepreneur"; label: string } | null {
  if (
    incomeType.includes("business_owner") ||
    incomeType.includes("freelance") ||
    incomeType.includes("mixed")
  ) {
    return { tier: "entrepreneur", label: "Business" };
  }
  return null;
}

const primaryButtonClass =
  "flex min-h-11 w-full items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50";
const secondaryButtonClass =
  "flex min-h-11 w-full items-center justify-center rounded-xl border border-card-border px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-foreground/5 hover:text-foreground disabled:opacity-50";

const FIRST_ACTIONS = [
  { value: "manual", label: "Add one manually" },
  { value: "csv", label: "Import a CSV" },
  { value: "receipt", label: "Snap a receipt photo" },
] as const;
type FirstAction = (typeof FIRST_ACTIONS)[number]["value"];

// Shared tappable card for both the income-type and goal steps — a card
// selector reads as more modern and satisfying to use than a plain
// checkbox/pill list, per the redesign brief. Selected state uses the same
// accent-border + tint treatment as PricingSection's highlighted tier
// (border-2 border-accent) and PersonaTabs' color-mix tint technique,
// rather than a flat accent fill, so it reads as "chosen" without being as
// visually loud as a solid-color button. active:scale gives the tap a
// small, satisfying give.
function OptionCard({
  emoji,
  label,
  selected,
  onClick,
}: {
  emoji: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      style={
        selected
          ? { background: "color-mix(in srgb, var(--accent) 8%, var(--card))" }
          : undefined
      }
      className={`flex min-h-11 w-full items-center gap-3 rounded-2xl p-4 text-left transition-all duration-150 ease-out active:scale-[0.97] ${
        selected
          ? "border-2 border-accent"
          : "border border-card-border bg-card hover:bg-foreground/5"
      }`}
    >
      <span className="text-xl" aria-hidden="true">
        {emoji}
      </span>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </button>
  );
}

// Segmented progress bar + "Step X of N" text — a required, non-skippable
// (well, "Skip for now"-able) flow reads as a chore without a sense of how
// much is left. Segments fill for the current and completed steps.
function ProgressBar({ step }: { step: number }) {
  return (
    <div>
      <div className="flex gap-1.5">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              i < step ? "bg-accent" : "bg-card-border"
            }`}
          />
        ))}
      </div>
      <p className="mt-2 text-xs font-medium text-foreground-muted">
        Step {step} of {TOTAL_STEPS}
      </p>
    </div>
  );
}

export function OnboardingFlow() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [incomeType, setIncomeType] = useState<IncomeType[]>([]);
  const [goalTypes, setGoalTypes] = useState<GoalOption[]>([]);
  const [mainGoal, setMainGoal] = useState("");
  const [firstAction, setFirstAction] = useState<FirstAction | null>(null);
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

  function toggleGoalType(value: GoalOption) {
    setGoalTypes((prev) =>
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
        goalTypes,
        mainGoal,
        acceptedTier: acceptTier ? (recommendation?.tier ?? null) : null,
        firstAction,
      });
    });
  }

  const recommendation = recommendTier(incomeType);

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-4 bg-background px-4 py-16">
      <div className="absolute top-4 left-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm space-y-5 rounded-xl bg-card p-8 sm:max-w-md">
        <ProgressBar step={step} />

        {/* Keyed by step so the fade+slide replays on every transition —
            same keyed-remount technique as the landing page's persona tabs. */}
        <div key={step} className="animate-[stepIn_350ms_ease-out] space-y-5">
          {step === 1 && (
            <>
              <h1 className="text-lg font-bold text-foreground">How do you make money?</h1>
              <p className="text-sm text-foreground-muted">Pick everything that applies.</p>
              <div className="flex flex-col gap-2">
                {INCOME_TYPE_OPTIONS.map((option) => (
                  <OptionCard
                    key={option.value}
                    emoji={option.emoji}
                    label={option.label}
                    selected={incomeType.includes(option.value)}
                    onClick={() => toggleIncomeType(option.value)}
                  />
                ))}
              </div>
              <button onClick={() => setStep(2)} className={primaryButtonClass}>
                Continue
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="text-lg font-bold text-foreground">What are you working toward?</h1>
              <p className="text-sm text-foreground-muted">Pick everything that applies.</p>
              <div className="flex flex-col gap-2">
                {GOAL_OPTIONS.map((option) => (
                  <OptionCard
                    key={option.value}
                    emoji={option.emoji}
                    label={option.label}
                    selected={goalTypes.includes(option.value)}
                    onClick={() => toggleGoalType(option.value)}
                  />
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-muted">
                  Want to add more detail? (optional)
                </label>
                <textarea
                  value={mainGoal}
                  onChange={(e) => setMainGoal(e.target.value)}
                  placeholder={GOAL_PLACEHOLDERS[placeholderIndex]}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-card-border bg-input-bg px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted"
                />
              </div>
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
              <h1 className="text-lg font-bold text-foreground">
                How do you want to add your first transactions?
              </h1>
              <div className="flex flex-col gap-2">
                {FIRST_ACTIONS.map((action) => (
                  <button
                    key={action.value}
                    onClick={() => setFirstAction(action.value)}
                    aria-pressed={firstAction === action.value}
                    className={`flex min-h-11 w-full items-center rounded-xl px-4 py-2 text-left text-sm font-medium ${
                      firstAction === action.value
                        ? "bg-accent text-accent-foreground"
                        : "border border-card-border text-foreground-muted hover:bg-foreground/5 hover:text-foreground"
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setStep(2)}
                  className="-my-2 -mx-1 px-1 py-2 text-sm text-foreground-muted hover:text-foreground"
                >
                  ← Back
                </button>
              </div>
              {/* The only place "Skip for now" appears — income type and
                  goals are required, but by this step users may genuinely
                  not have transactions ready to add yet, so a real
                  full-width escape hatch (not a subtle corner link) sits
                  right above Continue. */}
              <button
                onClick={handleSkip}
                disabled={isPending}
                className={secondaryButtonClass}
              >
                Skip for now
              </button>
              <button onClick={() => setStep(4)} className={primaryButtonClass}>
                Continue
              </button>
            </>
          )}

          {step === 4 && (
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
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setStep(3)}
                  className="-my-2 -mx-1 px-1 py-2 text-sm text-foreground-muted hover:text-foreground"
                >
                  ← Back
                </button>
              </div>
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
    </div>
  );
}
