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
import { formatDollarSigned } from "@/lib/format";
import type { MonthlyNetFlowPoint } from "@/lib/net-flow";
import { useChartTheme } from "./useChartTheme";

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
  const totalVar = total >= 0 ? "--positive" : "--critical";

  return (
    <section className="mb-4">
      {/* Hero: the one number this whole tab orbits around, same dominant/
          sign-tinted treatment as Net this month (Dashboard) and headroom
          (Goals) — not just a smaller figure floating next to the title. */}
      {points.length > 0 && (
        <div
          className="rounded-xl p-6"
          style={{ background: `color-mix(in srgb, var(${totalVar}) 10%, var(--card))` }}
        >
          <p className="text-xs font-medium text-foreground-muted">Your Savings Journey</p>
          <p className="mt-1 truncate text-4xl font-bold" style={{ color: `var(${totalVar})` }}>
            {formatDollarSigned(total)}
          </p>
          <p className="mt-1 text-xs text-foreground-muted">
            Your running total of income minus spending, month by month.
          </p>
        </div>
      )}

      {/* Chart stays full-width in its own card underneath — it needs the
          room, not squeezed alongside the hero. */}
      <div className="mt-3 rounded-xl bg-card p-5">
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
