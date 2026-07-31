"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  HORIZON_OPTIONS_YEARS,
  INVESTMENT_OPTIONS,
  buildGrowthProjections,
  type ProjectionPoint,
} from "@/lib/growth-projection";
import { formatCurrency } from "@/lib/format";
import { useChartTheme } from "./useChartTheme";

function GrowthTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload: ProjectionPoint }[];
  label?: number;
}) {
  const colors = useChartTheme();
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div
      style={{
        fontSize: 13,
        backgroundColor: colors.tooltipBg,
        border: `1px solid ${colors.tooltipBorder}`,
        borderRadius: 12,
        padding: "8px 12px",
      }}
    >
      <p style={{ color: colors.tick, marginBottom: 4 }}>Year {label}</p>
      {INVESTMENT_OPTIONS.map((option) => (
        <p key={option.key} style={{ color: colors.ink }}>
          <span style={{ color: option.color }}>●</span> {option.label}: $
          {formatCurrency(point[option.key])}
        </p>
      ))}
    </div>
  );
}

// Lives in Insights, right after the 50-30-20 module. Default monthly
// contribution is a planning number — average monthly income over the last
// 3 completed months minus every category's combined spending goal, i.e.
// what's left over if the plan is followed — and the "include what I've
// saved so far" toggle seeds from lifetime gross savings. Both stay
// editable — the defaults are a starting point, not a lock.
export function GrowthExplorerCard({
  defaultMonthlyContribution,
  savedSoFar,
}: {
  defaultMonthlyContribution: number;
  savedSoFar: number;
}) {
  const colors = useChartTheme();
  // Raw text, not a number — a controlled <input> whose value is forced
  // back to a coerced number on every keystroke can never show a genuinely
  // empty field, which traps you the moment you backspace out a "0": React
  // immediately redraws it as "0" again before you can type a replacement.
  // Parsing happens only where the number is actually used, so the field
  // can sit empty mid-edit like any normal text input.
  const [monthlyContributionInput, setMonthlyContributionInput] = useState(
    String(Math.round(defaultMonthlyContribution) || 200),
  );
  const monthlyContribution = Math.max(0, Number(monthlyContributionInput) || 0);
  const [includeSavedSoFar, setIncludeSavedSoFar] = useState(savedSoFar > 0);
  const [years, setYears] = useState<(typeof HORIZON_OPTIONS_YEARS)[number]>(10);

  const startingAmount = includeSavedSoFar ? Math.max(0, savedSoFar) : 0;

  const points = useMemo(
    () => buildGrowthProjections({ startingAmount, monthlyContribution, years }),
    [startingAmount, monthlyContribution, years],
  );

  const finalPoint = points[points.length - 1];

  return (
    <section className="mb-4 rounded-xl bg-card p-5">
      <h2 className="font-bold text-foreground">Where could your savings go?</h2>
      <p className="mt-1 text-sm text-foreground-muted">
        See how a monthly contribution could grow if invested, based on historical average
        returns.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-foreground-muted">
            Monthly contribution
          </label>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-sm text-foreground-muted">$</span>
            <input
              type="number"
              min="0"
              step="10"
              value={monthlyContributionInput}
              onChange={(e) => setMonthlyContributionInput(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-card-border bg-input-bg px-3 py-2 text-sm text-foreground"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-muted">Time horizon</label>
          <div className="mt-1 flex gap-1.5">
            {HORIZON_OPTIONS_YEARS.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setYears(y)}
                aria-pressed={years === y}
                className={`flex min-h-11 flex-1 items-center justify-center rounded-xl text-sm font-medium ${
                  years === y
                    ? "bg-accent text-accent-foreground"
                    : "border border-card-border text-foreground-muted hover:bg-foreground/5 hover:text-foreground"
                }`}
              >
                {y}y
              </button>
            ))}
          </div>
        </div>
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={includeSavedSoFar}
          onChange={(e) => setIncludeSavedSoFar(e.target.checked)}
        />
        Include what I&apos;ve already saved (${formatCurrency(Math.max(0, savedSoFar))})
      </label>

      <div className="mt-5 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 8, bottom: 8, left: 4 }}>
            <CartesianGrid vertical={false} stroke={colors.grid} />
            <XAxis
              dataKey="year"
              tickFormatter={(v) => `Yr ${v}`}
              interval="preserveStartEnd"
              tick={{ fontSize: 11, fill: colors.tick }}
              axisLine={{ stroke: colors.grid }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `$${Math.round(Number(v)).toLocaleString("en-US")}`}
              tick={{ fontSize: 11, fill: colors.tick }}
              axisLine={false}
              tickLine={false}
              width={64}
            />
            <Tooltip content={<GrowthTooltip />} />
            {INVESTMENT_OPTIONS.map((option) => (
              <Line
                key={option.key}
                type="monotone"
                dataKey={option.key}
                stroke={option.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 space-y-1.5 border-t border-card-border pt-4">
        {INVESTMENT_OPTIONS.map((option) => (
          <div key={option.key} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-foreground-muted">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: option.color }}
              />
              {option.label} ({option.annualReturnPercent}%/yr avg)
            </span>
            <span className="font-bold text-foreground">
              ${formatCurrency(finalPoint[option.key])}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-foreground-muted">
        Illustrative only, based on historical average annual returns — not a guarantee of
        future performance, and not financial advice. Talk to a professional before investing.
      </p>
    </section>
  );
}
