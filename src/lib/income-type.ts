// Single source of truth — shared by the onboarding flow and Profile's
// editable field, same convention as lib/recurring.ts's RECURRING_INTERVALS.
export const INCOME_TYPES = ["salaried", "freelance", "business_owner"] as const;
export type IncomeType = (typeof INCOME_TYPES)[number];

export const INCOME_TYPE_LABEL: Record<IncomeType, string> = {
  salaried: "Salaried / employed",
  freelance: "Freelance / self-employed",
  business_owner: "Small business owner",
};

export function isIncomeType(value: string): value is IncomeType {
  return (INCOME_TYPES as readonly string[]).includes(value);
}
