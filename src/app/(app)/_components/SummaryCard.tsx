"use client";

import { useMemo, useState } from "react";
import { AMOUNT_TEXT_CLASS, formatSignedAmount } from "@/lib/format";
import { getPeriodRange } from "@/lib/date-ranges";

type Transaction = {
  date: string;
  amount: number;
  type: "income" | "expense";
};

type SummaryPeriod = "monthly" | "this-year" | "all-time";

const activeClass = "bg-white text-gray-900";
const inactiveClass = "text-foreground-muted hover:text-white";

export function SummaryCard({ transactions }: { transactions: Transaction[] }) {
  const [summaryPeriod, setSummaryPeriod] = useState<SummaryPeriod>("monthly");

  const { filtered, label } = useMemo(() => {
    const now = new Date();
    if (summaryPeriod === "monthly") {
      const monthPrefix = now.toISOString().slice(0, 7); // "YYYY-MM"
      const monthLabel = now.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      return {
        filtered: transactions.filter((t) => t.date.startsWith(monthPrefix)),
        label: `${monthLabel} summary`,
      };
    }
    if (summaryPeriod === "this-year") {
      // Full calendar year, including transactions already entered with a
      // future date — same "this year" window the charts use.
      const { start, end } = getPeriodRange("this-year", now);
      return {
        filtered: transactions.filter((t) => t.date >= start && t.date <= end),
        label: `${now.getFullYear()} summary`,
      };
    }
    return { filtered: transactions, label: "All-time summary" };
  }, [transactions, summaryPeriod]);

  const income = filtered
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const expense = filtered
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const net = income - expense;

  return (
    <section className="mb-10 rounded-2xl border border-card-border bg-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-white">{label}</h2>
        <div className="flex overflow-hidden rounded-2xl border border-card-border">
          <button
            onClick={() => setSummaryPeriod("monthly")}
            aria-pressed={summaryPeriod === "monthly"}
            className={`px-3 py-1.5 text-sm font-medium ${
              summaryPeriod === "monthly" ? activeClass : inactiveClass
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setSummaryPeriod("this-year")}
            aria-pressed={summaryPeriod === "this-year"}
            className={`border-l border-card-border px-3 py-1.5 text-sm font-medium ${
              summaryPeriod === "this-year" ? activeClass : inactiveClass
            }`}
          >
            This year
          </button>
          <button
            onClick={() => setSummaryPeriod("all-time")}
            aria-pressed={summaryPeriod === "all-time"}
            className={`border-l border-card-border px-3 py-1.5 text-sm font-medium ${
              summaryPeriod === "all-time" ? activeClass : inactiveClass
            }`}
          >
            All-time
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs font-medium text-foreground-muted">Income</p>
          <p className={`mt-1 text-xl font-bold ${AMOUNT_TEXT_CLASS.income}`}>
            {formatSignedAmount(income, "income")}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-foreground-muted">Expenses</p>
          <p className={`mt-1 text-xl font-bold ${AMOUNT_TEXT_CLASS.expense}`}>
            {formatSignedAmount(expense, "expense")}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-foreground-muted">Net</p>
          <p
            className={`mt-1 text-xl font-bold ${
              net >= 0 ? AMOUNT_TEXT_CLASS.income : AMOUNT_TEXT_CLASS.expense
            }`}
          >
            {formatSignedAmount(net, net >= 0 ? "income" : "expense")}
          </p>
        </div>
      </div>
    </section>
  );
}
