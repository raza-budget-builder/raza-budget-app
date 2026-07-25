export type TransactionType = "income" | "expense";

// Backed by the --positive/--attention CSS vars (globals.css) — same bright
// pastel values in both themes on purpose; these are meaningful, recognized
// colors, not surface chrome that should shift with light/dark.
export const AMOUNT_TEXT_CLASS: Record<TransactionType, string> = {
  income: "text-positive",
  expense: "text-attention",
};

// Pending recurring predictions — distinct hue from the income/expense pair
// so it reads as "not final yet" rather than as a third amount-sign color.
export const PENDING_TEXT_CLASS = "text-pending";

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
