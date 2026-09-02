"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  HORIZON_OPTIONS_DAYS,
  computeCashFlowForecast,
  formatCashFlowSentence,
  type CashFlowPoint,
  type HorizonDays,
  type RecurringOccurrence,
} from "@/lib/cashflow-projection";
import { formatDollarSigned } from "@/lib/format";
import { useChartTheme } from "./useChartTheme";

// Same reserved status hues as globals.css's --critical/--attention
// (identical in both themes there too) — hardcoded here for the same
// reason useChartTheme.ts hardcodes its own palette: Recharts renders
// stroke/fill as literal SVG attributes, which don't resolve a CSS var()
// the way an ordinary style property does.
const CRITICAL_COLOR = "#f87171";
const ATTENTION_COLOR = "#fb923c";

function formatDay(dateISO: string): string {
  return new Date(`${dateISO}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function CashFlowTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: CashFlowPoint }[];
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
      <p style={{ color: colors.tick, marginBottom: 4 }}>
        {point.daysFromToday === 0 ? "Today" : formatDay(point.date)}
      </p>
      <p style={{ color: colors.ink }}>Projected balance: {formatDollarSigned(point.balance)}</p>
    </div>
  );
}

// Lives in Insights, right after Net Flow — that chart shows where your
// balance has been; this one projects where it's headed, using known
// recurring bills (real due dates) plus a smoothed rate for everything
// else. dailyIrregularSpend/recurringOccurrences come from the server (see
// insights/page.tsx) since both need a DB round-trip; the horizon toggle
// then just re-runs the pure projection client-side, same "fetch once,
// recompute on toggle" split as GrowthExplorerCard's year selector.
export function CashFlowForecastCard({
  startingBalance,
  dailyIrregularSpend,
  recurringOccurrences,
}: {
  startingBalance: number;
  dailyIrregularSpend: number | null;
  recurringOccurrences: RecurringOccurrence[];
}) {
  const colors = useChartTheme();
  const [horizonDays, setHorizonDays] = useState<HorizonDays>(30);

  const forecast = useMemo(() => {
    if (dailyIrregularSpend === null) return null;
    return computeCashFlowForecast({
      startingBalance,
      dailyIrregularSpend,
      recurringOccurrences,
      horizonDays,
    });
  }, [startingBalance, dailyIrregularSpend, recurringOccurrences, horizonDays]);

  return (
    <section className="mb-4 rounded-xl bg-card p-5">
      <h2 className="font-bold text-foreground">Cash flow forecast</h2>
      <p className="mt-1 text-sm text-foreground-muted">
        See what&apos;s coming before it hits your account — a day-by-day projection from your
        known bills and typical spending.
      </p>

      {forecast ? (
        <>
          <div className="mt-4 flex gap-1.5">
            {HORIZON_OPTIONS_DAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setHorizonDays(d)}
                aria-pressed={horizonDays === d}
                className={`flex min-h-11 flex-1 items-center justify-center rounded-xl text-sm font-medium ${
                  horizonDays === d
                    ? "bg-accent text-accent-foreground"
                    : "border border-card-border text-foreground-muted hover:bg-foreground/5 hover:text-foreground"
                }`}
              >
                {d} days
              </button>
            ))}
          </div>

          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecast.points} margin={{ top: 8, right: 8, bottom: 8, left: 4 }}>
                <CartesianGrid vertical={false} stroke={colors.grid} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDay}
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
                <ReferenceLine y={0} stroke={CRITICAL_COLOR} strokeDasharray="4 4" />
                <Tooltip content={<CashFlowTooltip />} />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke={forecast.tightDate ? ATTENTION_COLOR : colors.ink}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="mt-4 text-sm text-foreground">
            {formatCashFlowSentence(forecast, horizonDays)}
          </p>
        </>
      ) : (
        <p className="mt-4 text-sm text-foreground-muted">
          Keep tracking for a couple of weeks and we&apos;ll be able to project your balance
          forward.
        </p>
      )}

      <p className="mt-4 text-xs text-foreground-muted">
        Illustrative only, based on your typical spending, not a guarantee — a big one-off
        purchase won&apos;t be predicted.
      </p>
    </section>
  );
}
