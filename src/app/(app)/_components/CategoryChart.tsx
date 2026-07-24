"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CategorySpend } from "@/lib/category-spend";
import { formatCurrency } from "@/lib/format";
import { categoryColor } from "@/lib/category-color";

export type ChartType = "pie" | "column";
export type ValueMode = "dollar" | "percent";

export function CategoryChart({
  data,
  type,
  chartType,
  valueMode,
  emptyMessage,
}: {
  data: CategorySpend[];
  type: "income" | "expense";
  chartType: ChartType;
  valueMode: ValueMode;
  emptyMessage: string;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-foreground-muted">{emptyMessage}</p>;
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const formatValue = (v?: number | string | readonly (number | string)[]) => {
    const n = Number(v);
    return valueMode === "dollar"
      ? `$${formatCurrency(n)}`
      : `${total > 0 ? ((n / total) * 100).toFixed(0) : 0}%`;
  };
  // Axis ticks drop the cents — full precision belongs in the tooltip, not
  // a narrow Y-axis column where it just gets clipped.
  const formatAxisValue = (v?: number | string | readonly (number | string)[]) => {
    const n = Number(v);
    return valueMode === "dollar"
      ? `$${Math.round(n).toLocaleString("en-US")}`
      : `${total > 0 ? Math.round((n / total) * 100) : 0}%`;
  };

  if (chartType === "column") {
    return (
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 48, left: 4 }}>
            <CartesianGrid vertical={false} stroke="#333d6c" />
            <XAxis
              dataKey="name"
              interval={0}
              angle={-40}
              textAnchor="end"
              height={60}
              tick={{ fontSize: 11, fill: "#99a3c2" }}
              axisLine={{ stroke: "#333d6c" }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => formatAxisValue(v)}
              tick={{ fontSize: 11, fill: "#99a3c2" }}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip
              formatter={(value) => formatValue(value)}
              contentStyle={{
                fontSize: 13,
                backgroundColor: "#1a2444",
                border: "1px solid #333d6c",
                borderRadius: 12,
              }}
              itemStyle={{ color: "#ffffff" }}
              labelStyle={{ color: "#99a3c2" }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={24}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={categoryColor(entry.name, type)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={0}
            outerRadius={80}
            paddingAngle={data.length > 1 ? 1 : 0}
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={categoryColor(entry.name, type)}
                stroke="#1a2444"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatValue(value)}
            contentStyle={{
              fontSize: 13,
              backgroundColor: "#1a2444",
              border: "1px solid #333d6c",
              borderRadius: 12,
            }}
            itemStyle={{ color: "#ffffff" }}
            labelStyle={{ color: "#99a3c2" }}
          />
          <Legend
            verticalAlign="bottom"
            height={48}
            wrapperStyle={{ fontSize: 12 }}
            // Recharts colors legend labels with the series hue by default,
            // which fails as text (light hues like yellow are illegible on
            // a dark surface) and breaks the rule that identity lives in the
            // swatch, not the text. Force every label to the same muted
            // light ink instead.
            formatter={(value: string) => (
              <span style={{ color: "#99a3c2" }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
