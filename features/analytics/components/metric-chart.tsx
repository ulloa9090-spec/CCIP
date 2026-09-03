"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from "date-fns";
import type { AnalyticsMetric } from "@/features/analytics/types";

const SERIES_COLORS = ["var(--accent)", "var(--success)"];

function formatTick(dateStr: string): string {
  return format(new Date(`${dateStr}T00:00:00`), "MMM d");
}

function formatValue(value: number, unit: AnalyticsMetric["unit"]): string {
  if (unit === "percent" || unit === "score") return `${value}%`;
  if (unit === "minutes") return `${value} min`;
  return String(value);
}

export function MetricChart({ metric }: { metric: AnalyticsMetric }) {
  const dates = metric.series[0]?.points.map((p) => p.date) ?? [];
  const data = dates.map((date, i) => {
    const row: Record<string, number | string | null> = { date };
    for (const s of metric.series) row[s.label] = s.points[i]?.value ?? null;
    return row;
  });
  const tickInterval = Math.max(0, Math.floor(data.length / 6) - 1);

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatTick}
            tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
            interval={tickInterval}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} width={32} />
          <Tooltip
            labelFormatter={(label) => formatTick(String(label))}
            formatter={(value) => formatValue(Number(value), metric.unit)}
            contentStyle={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
              fontSize: 12,
              borderRadius: 6,
            }}
          />
          {metric.series.map((s, i) => (
            <Line
              key={s.label}
              type="monotone"
              dataKey={s.label}
              name={s.label}
              stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
