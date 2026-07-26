// Fixed categorical order, validated for CVD-safe adjacent contrast at 6
// slots (see dataviz skill's palette.md). Never reassign or cycle these.
export const CATEGORY_COLORS = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
];

// Muted ink, for the folded "Other" pie slice and for "Uncategorized" rows.
export const OTHER_COLOR = "#898781";

// Mirrors the exact order categories are seeded in for a new user
// (supabase/schema.sql's handle_new_user_categories trigger). Used to give
// each default category a fixed, collision-free color slot (index mod the
// 6-color palette) instead of a name hash — a hash can (and did) put two
// unrelated categories like "Salary"/"Freelance Income" or "Dining Out"/
// "Groceries" on the exact same color by chance. Since income has exactly 6
// seeded categories and expense charts only ever show up to 5 real slices
// (the rest fold into "Other" — see MAX_PIE_SLICES in category-spend.ts),
// walking this fixed list guarantees every category that can actually
// appear together in one chart gets a distinct color.
const INCOME_CATEGORY_ORDER = [
  "Salary",
  "Freelance Income",
  "Business Revenue",
  "Investment Income",
  "Gifts",
  "Other Income",
];

const EXPENSE_CATEGORY_ORDER = [
  "Rent/Mortgage",
  "Utilities",
  "Groceries",
  "Dining Out",
  "Transportation",
  "Insurance",
  "Health & Medical",
  "Personal Care",
  "Subscriptions",
  "Entertainment",
  "Shopping",
  "Debt Payments",
  "Childcare & Education",
  "Travel",
  "Gifts & Donations",
  "Pet Care",
  "Home Maintenance",
  "Business Expenses",
  "Taxes",
  "Other Expense",
  "Savings & Investments",
  "Tithing",
];

function hashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length];
}

// A category's color must follow the entity, never its rank — a period
// change that reorders categories by spend must not repaint the survivors.
// Passing `type` (recommended whenever it's known) looks the category up in
// the fixed seed order above for a collision-free slot; without it, or for
// a custom category name the user added that isn't in that list, this falls
// back to the previous stable name-hash so it's still deterministic, just
// not collision-free against the rest of the palette.
export function categoryColor(
  name: string | null | undefined,
  type?: "income" | "expense",
): string {
  if (!name || name === "Other") return OTHER_COLOR;

  const orderedList =
    type === "income" ? INCOME_CATEGORY_ORDER : type === "expense" ? EXPENSE_CATEGORY_ORDER : null;
  const idx = orderedList?.indexOf(name) ?? -1;
  if (idx !== -1) return CATEGORY_COLORS[idx % CATEGORY_COLORS.length];

  return hashColor(name);
}
