"use client";

import { useMemo, useState } from "react";
import { buildCategorySpend } from "@/lib/category-spend";
import {
  DEFAULT_PERIOD,
  PERIOD_OPTIONS,
  getPeriodRange,
  type PeriodKey,
} from "@/lib/date-ranges";
import { CategoryChart, type ChartType, type ValueMode } from "./CategoryChart";
import { ColumnChartIcon, PieChartIcon } from "./icons";

type Transaction = {
  date: string;
  amount: number;
  type: "income" | "expense";
  category: { name: string } | null;
};

const activeClass = "bg-white text-gray-900";
const inactiveClass = "text-foreground-muted hover:text-white";

export function CategoryCharts({ transactions }: { transactions: Transaction[] }) {
  const [period, setPeriod] = useState<PeriodKey>(DEFAULT_PERIOD);
  const [chartType, setChartType] = useState<ChartType>("pie");
  const [valueMode, setValueMode] = useState<ValueMode>("dollar");

  const { expenseData, incomeData } = useMemo(() => {
    const { start, end } = getPeriodRange(period);
    const inRange = transactions.filter((t) => t.date >= start && t.date <= end);
    return {
      expenseData: buildCategorySpend(inRange, "expense"),
      incomeData: buildCategorySpend(inRange, "income"),
    };
  }, [transactions, period]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <div className="flex overflow-hidden rounded-2xl border border-card-border">
          <button
            onClick={() => setChartType("pie")}
            aria-label="Pie chart"
            aria-pressed={chartType === "pie"}
            title="Pie chart"
            className={`p-1.5 ${chartType === "pie" ? activeClass : inactiveClass}`}
          >
            <PieChartIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setChartType("column")}
            aria-label="Column chart"
            aria-pressed={chartType === "column"}
            title="Column chart"
            className={`border-l border-card-border p-1.5 ${
              chartType === "column" ? activeClass : inactiveClass
            }`}
          >
            <ColumnChartIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex overflow-hidden rounded-2xl border border-card-border">
          <button
            onClick={() => setValueMode("dollar")}
            aria-label="Show dollar amounts"
            aria-pressed={valueMode === "dollar"}
            title="Dollar amounts"
            className={`w-8 py-1.5 text-sm font-medium ${
              valueMode === "dollar" ? activeClass : inactiveClass
            }`}
          >
            $
          </button>
          <button
            onClick={() => setValueMode("percent")}
            aria-label="Show percentages"
            aria-pressed={valueMode === "percent"}
            title="Percentages"
            className={`w-8 border-l border-card-border py-1.5 text-sm font-medium ${
              valueMode === "percent" ? activeClass : inactiveClass
            }`}
          >
            %
          </button>
        </div>

        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as PeriodKey)}
          className="rounded-2xl border border-card-border bg-input-bg px-2 py-1.5 text-sm text-white"
        >
          {PERIOD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="mb-2 text-sm font-bold text-white">Expense</h3>
          <CategoryChart
            data={expenseData}
            type="expense"
            chartType={chartType}
            valueMode={valueMode}
            emptyMessage="No expense transactions in this period."
          />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-bold text-white">Income</h3>
          <CategoryChart
            data={incomeData}
            type="income"
            chartType={chartType}
            valueMode={valueMode}
            emptyMessage="No income transactions in this period."
          />
        </div>
      </div>
    </div>
  );
}
