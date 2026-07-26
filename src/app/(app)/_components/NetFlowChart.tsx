"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/format";
import type { MonthlyNetFlowPoint } from "@/lib/net-flow";
import { useChartTheme } from "./useChartTheme";

// Same green used for income amounts elsewhere in the app.
const TOTAL_COLOR = "var(--positive)";

function formatDollarSigned(n: number): string {
  const sign = n < 0 ? "–" : n > 0 ? "+" : "";
  return `${sign}$${formatCurrency(Math.abs(n))}`;
}

function NetFlowTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload: MonthlyNetFlowPoint }[];
  label?: string;
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
      <p style={{ color: colors.tick, marginBottom: 4 }}>{label}</p>
      <p style={{ color: colors.ink }}>Net this month: {formatDollarSigned(point.net)}</p>
      <p style={{ color: colors.ink }}>Cumulative: {formatDollarSigned(point.cumulative)}</p>
    </div>
  );
}

export function NetFlowChart({ points }: { points: MonthlyNetFlowPoint[] }) {
  const colors = useChartTheme();
  const total = points.length > 0 ? points[points.length - 1].cumulative : 0;

  return (
    <section className="mb-10 rounded-xl border border-card-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bold text-foreground">Your Savings Journey</h2>
          <p className="mt-1 text-sm text-foreground-muted">
            Your running total of income minus spending, month by month.
          </p>
        </div>
        {points.length > 0 && (
          <span
            className="shrink-0 text-xl font-bold"
            style={{ color: TOTAL_COLOR }}
          >
            {formatDollarSigned(total)}
          </span>
        )}
      </div>

      <div className="mt-6">
        {points.length === 0 ? (
          <p className="text-sm text-foreground-muted">
            Add some transactions to see your savings trend over time.
          </p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 8, right: 8, bottom: 8, left: 4 }}>
                <CartesianGrid vertical={false} stroke={colors.grid} />
                <XAxis
                  dataKey="label"
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
                <Tooltip content={<NetFlowTooltip />} />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke={colors.ink}
                  strokeWidth={2}
                  dot={{ r: 3, fill: colors.ink, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}
