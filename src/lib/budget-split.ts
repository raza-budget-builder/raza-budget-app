export type BudgetGroup = "needs" | "wants" | "savings";

export type BudgetSplitRow = {
  group: BudgetGroup;
  label: string;
  actual: number;
  targetPercent: number;
  targetAmount: number;
  actualPercent: number;
  deltaPercent: number;
  status: "on-target" | "over" | "under";
  isGood: boolean;
};

const TARGET_PERCENT: Record<BudgetGroup, number> = {
  needs: 50,
  wants: 30,
  savings: 20,
};

const LABEL: Record<BudgetGroup, string> = {
  needs: "Needs",
  wants: "Wants",
  savings: "Savings",
};

const GROUPS: BudgetGroup[] = ["needs", "wants", "savings"];

export function buildBudgetSplit(
  transactions: {
    amount: number;
    type: "income" | "expense";
    category: { budget_group: string | null } | null;
  }[],
): { income: number; rows: BudgetSplitRow[] } {
  const income = transactions
    .filter((t) => t.type === "income" && t.category?.budget_group !== "excluded")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const nonExcludedExpenses = transactions
    .filter((t) => t.type === "expense" && t.category?.budget_group !== "excluded")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const rows = GROUPS.map((group) => {
    // Needs/Wants are tallied by their own category assignments. Savings is
    // gross savings instead — whatever's left after all non-excluded
    // spending, not just transactions explicitly tagged "Savings &
    // Investments" — so unspent income counts as saved even if it was never
    // manually logged as a savings transaction.
    const actual =
      group === "savings"
        ? income - nonExcludedExpenses
        : transactions
            .filter((t) => t.type === "expense" && t.category?.budget_group === group)
            .reduce((sum, t) => sum + Number(t.amount), 0);

    const targetPercent = TARGET_PERCENT[group];
    const targetAmount = income * (targetPercent / 100);
    const actualPercent = income > 0 ? (actual / income) * 100 : 0;
    const deltaPercent = Math.round(Math.abs(actualPercent - targetPercent));

    // Needs/Wants: better to spend AT OR UNDER target. Savings: better to
    // save AT OR OVER target.
    const isGood =
      group === "savings" ? actualPercent >= targetPercent : actualPercent <= targetPercent;

    const status: BudgetSplitRow["status"] =
      deltaPercent === 0 ? "on-target" : actualPercent > targetPercent ? "over" : "under";

    return {
      group,
      label: LABEL[group],
      actual,
      targetPercent,
      targetAmount,
      actualPercent,
      deltaPercent,
      status,
      isGood,
    };
  });

  return { income, rows };
}
