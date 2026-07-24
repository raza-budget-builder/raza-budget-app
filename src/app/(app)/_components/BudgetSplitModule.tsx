"use client";

import { useMemo, useState } from "react";
import { buildBudgetSplit, type BudgetSplitRow } from "@/lib/budget-split";
import { formatCurrency } from "@/lib/format";

// Reuse this app's income/expense colors so "good" and "off target" read
// consistently with the green/orange used everywhere else (transaction
// amounts, category charts), rather than a third color pair. Same bright
// values as AMOUNT_TEXT_CLASS, validated against the dark card surface.
const GOOD_COLOR = "#4ade80";
const OFF_TARGET_COLOR = "#fb923c";

const MONTH_OPTIONS_COUNT = 25; // this month + 24 back

type Transaction = {
  date: string;
  amount: number;
  type: "income" | "expense";
  category: { budget_group: string | null } | null;
};

function buildMonthOptions(today: Date) {
  const options: { value: string; label: string }[] = [];
  for (let i = 0; i < MONTH_OPTIONS_COUNT; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label =
      i === 0
        ? "This month"
        : d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    options.push({ value, label });
  }
  return options;
}

function statusText(row: BudgetSplitRow) {
  if (row.status === "on-target") return "On target";
  return `${row.deltaPercent}% ${row.status === "over" ? "over" : "under"} target`;
}

function MeterRow({ row }: { row: BudgetSplitRow }) {
  const fillWidth = Math.min(100, Math.max(0, row.actualPercent));
  const color = row.isGood ? GOOD_COLOR : OFF_TARGET_COLOR;

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2 text-sm">
        <span className="font-bold text-white">{row.label}</span>
        <span className="text-foreground-muted">
          ${formatCurrency(row.actual)} of ${formatCurrency(row.targetAmount)} target ·{" "}
          {Math.round(row.actualPercent)}%
        </span>
      </div>
      <div className="relative h-2.5 w-full rounded-full bg-white/10">
        <div
          className="h-2.5 rounded-full"
          style={{ width: `${fillWidth}%`, backgroundColor: color }}
        />
        {/* Target marker: a card-colored halo under a white core, so it cuts
            through the bright fill and still shows up against the dark track. */}
        <div
          className="absolute top-1/2 h-[14px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-card"
          style={{ left: `${row.targetPercent}%` }}
        />
        <div
          className="absolute top-1/2 h-[14px] w-px -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
          style={{ left: `${row.targetPercent}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-foreground-muted">{statusText(row)}</p>
    </div>
  );
}

export function BudgetSplitModule({ transactions }: { transactions: Transaction[] }) {
  const monthOptions = useMemo(() => buildMonthOptions(new Date()), []);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);

  const { income, rows } = useMemo(() => {
    const filtered = transactions.filter((t) => t.date.startsWith(selectedMonth));
    return buildBudgetSplit(filtered);
  }, [transactions, selectedMonth]);

  return (
    <section className="mb-10 rounded-2xl border border-card-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bold text-white">The 50-30-20 rule</h2>
          <p className="mt-1 text-sm text-foreground-muted">
            See how you compare to this popular split.
          </p>
        </div>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="shrink-0 rounded-2xl border border-card-border bg-input-bg px-2 py-1.5 text-sm text-white"
        >
          {monthOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6">
        {income <= 0 ? (
          <p className="text-sm text-foreground-muted">
            Add income transactions in this month to see your target breakdown.
          </p>
        ) : (
          <>
            <div className="space-y-5">
              {rows.map((row) => (
                <MeterRow key={row.group} row={row} />
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-card-border pt-4 text-xs text-foreground-muted">
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: GOOD_COLOR }}
                />
                On target or better
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: OFF_TARGET_COLOR }}
                />
                Off target
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-px bg-white" />
                Target
              </span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
