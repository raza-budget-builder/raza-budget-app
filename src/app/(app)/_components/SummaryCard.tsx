"use client";

import { useMemo, useState } from "react";
import { AMOUNT_TEXT_CLASS, formatDollarSigned, formatSignedAmount } from "@/lib/format";
import { getPeriodRange } from "@/lib/date-ranges";

type Transaction = {
  date: string;
  amount: number;
  type: "income" | "expense";
};

type SummaryPeriod = "monthly" | "this-year" | "all-time";

const NET_LABEL: Record<SummaryPeriod, string> = {
  monthly: "Net this month",
  "this-year": "Net this year",
  "all-time": "Net all-time",
};

const activeClass = "bg-accent text-accent-foreground";
const inactiveClass = "text-foreground-muted hover:text-foreground";

export function SummaryCard({
  transactions,
  quickActions,
}: {
  transactions: Transaction[];
  quickActions?: React.ReactNode;
}) {
  const [summaryPeriod, setSummaryPeriod] = useState<SummaryPeriod>("monthly");

  const filtered = useMemo(() => {
    const now = new Date();
    if (summaryPeriod === "monthly") {
      const monthPrefix = now.toISOString().slice(0, 7); // "YYYY-MM"
      return transactions.filter((t) => t.date.startsWith(monthPrefix));
    }
    if (summaryPeriod === "this-year") {
      // Full calendar year, including transactions already entered with a
      // future date — same "this year" window the charts use.
      const { start, end } = getPeriodRange("this-year", now);
      return transactions.filter((t) => t.date >= start && t.date <= end);
    }
    return transactions;
  }, [transactions, summaryPeriod]);

  const income = filtered
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const expense = filtered
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const net = income - expense;
  const netVar = net >= 0 ? "--positive" : "--critical";

  return (
    <section className="mb-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        {quickActions}
        <div className="flex gap-1">
          <button
            onClick={() => setSummaryPeriod("monthly")}
            aria-pressed={summaryPeriod === "monthly"}
            className={`flex min-h-11 items-center rounded-full px-2.5 py-1 text-xs font-medium ${
              summaryPeriod === "monthly" ? activeClass : inactiveClass
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setSummaryPeriod("this-year")}
            aria-pressed={summaryPeriod === "this-year"}
            className={`flex min-h-11 items-center rounded-full px-2.5 py-1 text-xs font-medium ${
              summaryPeriod === "this-year" ? activeClass : inactiveClass
            }`}
          >
            This year
          </button>
          <button
            onClick={() => setSummaryPeriod("all-time")}
            aria-pressed={summaryPeriod === "all-time"}
            className={`flex min-h-11 items-center rounded-full px-2.5 py-1 text-xs font-medium ${
              summaryPeriod === "all-time" ? activeClass : inactiveClass
            }`}
          >
            All-time
          </button>
        </div>
      </div>

      {/* The one number this screen is built around — dominant size, and a
          background tinted by its own sign (not the flat --card tone every
          other section uses) so it reads as the hero at a glance, not just
          another box in the stack. */}
      <div
        className="rounded-xl p-6"
        style={{ background: `color-mix(in srgb, var(${netVar}) 10%, var(--card))` }}
      >
        <p className="text-xs font-medium text-foreground-muted">{NET_LABEL[summaryPeriod]}</p>
        <p className="mt-1 truncate text-4xl font-bold" style={{ color: `var(${netVar})` }}>
          {formatDollarSigned(net)}
        </p>
      </div>

      {/* Supporting figures — smaller, grouped side by side, plain card
          tone, so they read as secondary detail under the hero above. */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="min-w-0 rounded-xl bg-card p-4">
          <p className="text-xs font-medium text-foreground-muted">Income</p>
          <p className={`mt-1 truncate text-lg font-bold ${AMOUNT_TEXT_CLASS.income}`}>
            {formatSignedAmount(income, "income")}
          </p>
        </div>
        <div className="min-w-0 rounded-xl bg-card p-4">
          <p className="text-xs font-medium text-foreground-muted">Expenses</p>
          <p className={`mt-1 truncate text-lg font-bold ${AMOUNT_TEXT_CLASS.expense}`}>
            {formatSignedAmount(expense, "expense")}
          </p>
        </div>
      </div>
    </section>
  );
}
