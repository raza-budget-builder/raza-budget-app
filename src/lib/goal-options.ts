// Single source of truth for the onboarding goal-selection step, same
// convention as lib/income-type.ts. Multi-select — financial goals aren't
// mutually exclusive (e.g. "Get out of debt" and "Save more" commonly
// coexist) — paired with an optional free-text field (profiles.main_goal)
// for any detail that doesn't fit a preset option.
export const GOAL_OPTIONS = [
  { value: "reduce_spending", label: "Reduce spending", emoji: "📉" },
  { value: "save_more", label: "Save more", emoji: "💰" },
  { value: "retire_comfortably", label: "Retire comfortably", emoji: "🏖️" },
  { value: "invest_more", label: "Invest more", emoji: "📈" },
  { value: "give_more", label: "Give more", emoji: "❤️" },
  { value: "big_purchase", label: "Save for a big purchase (home, wedding, etc.)", emoji: "🏠" },
  { value: "get_out_of_debt", label: "Get out of debt", emoji: "📊" },
  { value: "clearer_picture", label: "Just get a clearer picture of my finances", emoji: "🧭" },
] as const;

export type GoalOption = (typeof GOAL_OPTIONS)[number]["value"];

export function isGoalOption(value: string): value is GoalOption {
  return (GOAL_OPTIONS as readonly { value: string }[]).some((o) => o.value === value);
}
