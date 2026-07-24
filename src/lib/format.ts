export type TransactionType = "income" | "expense";

// Bright green/orange, contrast-validated against the dark card surface
// (#1a2444): income 8.7:1, expense 6.7:1 — both clear WCAG AA. The old
// #006300/#c2410c pair was tuned for white cards and reads as near-black
// on a dark surface, so these are new values, not a straight carry-over.
export const AMOUNT_TEXT_CLASS: Record<TransactionType, string> = {
  income: "text-[#4ade80]",
  expense: "text-[#fb923c]",
};

// Pending recurring predictions — 9.9:1 against the dark card surface,
// distinct hue from the income/expense pair so it reads as "not final yet"
// rather than as a third amount-sign color.
export const PENDING_TEXT_CLASS = "text-[#facc15]";

export function formatCurrency(amount: number) {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatSignedAmount(amount: number, type: TransactionType) {
  const abs = formatCurrency(Math.abs(amount));
  // A merchant refund on a credit card import is stored as a negative-amount
  // expense (so it nets against that category's spend) rather than income —
  // show it with a "+" so it doesn't read as an ordinary charge. Every
  // pre-existing row has amount >= 0, so this only changes refund rows.
  const isCredit = type === "income" || (type === "expense" && amount < 0);
  return isCredit ? `+$${abs}` : `–$${abs}`;
}
