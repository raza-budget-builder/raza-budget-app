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

const LINE_COLOR = "#ffffff";
// Same green used for income amounts elsewhere in the app.
const TOTAL_COLOR = "#4ade80";

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
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div
      style={{
        fontSize: 13,
        backgroundColor: "#1a2444",
        border: "1px solid #333d6c",
        borderRadius: 12,
        padding: "8px 12px",
      }}
    >
      <p style={{ color: "#99a3c2", marginBottom: 4 }}>{label}</p>
      <p style={{ color: "#ffffff" }}>Net this month: {formatDollarSigned(point.net)}</p>
      <p style={{ color: "#ffffff" }}>Cumulative: {formatDollarSigned(point.cumulative)}</p>
    </div>
  );
}

export function NetFlowChart({ points }: { points: MonthlyNetFlowPoint[] }) {
  const total = points.length > 0 ? points[points.length - 1].cumulative : 0;

  return (
    <section className="mb-10 rounded-2xl border border-card-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bold text-white">Your Savings Journey</h2>
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
                <CartesianGrid vertical={false} stroke="#333d6c" />
                <XAxis
                  dataKey="label"
                  interval="preserveStartEnd"
                  tick={{ fontSize: 11, fill: "#99a3c2" }}
                  axisLine={{ stroke: "#333d6c" }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `$${Math.round(Number(v)).toLocaleString("en-US")}`}
                  tick={{ fontSize: 11, fill: "#99a3c2" }}
                  axisLine={false}
                  tickLine={false}
                  width={64}
                />
                <Tooltip content={<NetFlowTooltip />} />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke={LINE_COLOR}
                  strokeWidth={2}
                  dot={{ r: 3, fill: LINE_COLOR, strokeWidth: 0 }}
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
