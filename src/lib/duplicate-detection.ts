import { descriptionSimilarity, SIMILARITY_THRESHOLD } from "./recurring";

// Scoped to manual, one-at-a-time entry points (the Add Transaction form,
// and the AI chat's record_transaction/record_recurring_transaction) — not
// CSV/screenshot import, which already has its own bulk review flow
// (suspected-transfer confirmation) and where re-importing an overlapping
// export is a distinct problem from a single accidental double-entry.

export type DuplicateCandidate = {
  id: string;
  date: string;
  description: string;
  amount: number;
  categoryName: string | null;
};

type ExistingTransaction = {
  id: string;
  date: string;
  amount: number;
  description: string;
  cleaned_description?: string | null;
  category: { id: string; name: string } | null;
};

// A duplicate is same date AND same amount AND (same category OR a
// similar-enough description) — reusing the exact similarity bar
// recurring-pattern detection already uses, rather than inventing a new
// one. Category-or-description (not both required) because either signal
// alone is a strong enough coincidence on top of an exact date+amount
// match to be worth a heads-up, without requiring the user to have
// re-typed the description identically.
export function findPossibleDuplicate(
  existing: ExistingTransaction[],
  candidate: { date: string; amount: number; description: string; categoryId: string | null },
): DuplicateCandidate | null {
  for (const t of existing) {
    if (t.date !== candidate.date) continue;
    if (Number(t.amount) !== candidate.amount) continue;

    const sameCategory = candidate.categoryId !== null && t.category?.id === candidate.categoryId;
    const similarDescription =
      descriptionSimilarity(candidate.description, t.cleaned_description ?? t.description) >=
      SIMILARITY_THRESHOLD;

    if (sameCategory || similarDescription) {
      return {
        id: t.id,
        date: t.date,
        description: t.description,
        amount: Number(t.amount),
        categoryName: t.category?.name ?? null,
      };
    }
  }
  return null;
}
