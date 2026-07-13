"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";

export function WeeklyChart({ data }: { data: { day: string; solved: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.solved, 0);
  const best = data.reduce((max, d) => (d.solved > max.solved ? d : max), data[0]);
  const activeDays = data.filter((d) => d.solved > 0).length;
  const avg = total / 7;

  const summary = [
    { label: "Total solved", value: String(total) },
    { label: "Best day", value: best && best.solved > 0 ? `${best.day} · ${best.solved}` : "—" },
    { label: "Daily average", value: avg > 0 ? avg.toFixed(1) : "0" },
    { label: "Active days", value: `${activeDays}/7` },
  ];

  return (
    <div>
      {/* Summary strip */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summary.map((s, i) => (
          <div
            key={s.label}
            className="card-enter rounded-xl bg-secondary/60 px-3.5 py-2.5"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <p className="eyebrow">{s.label}</p>
            <p className="figure mt-0.5 text-lg font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip
              cursor={false}
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 12,
                fontSize: 12,
              }}
              labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(value: number) => [`${value} solved`, null]}
            />
            <Bar
              dataKey="solved"
              radius={[6, 6, 6, 6]}
              maxBarSize={28}
              animationDuration={700}
              animationEasing="ease-out"
              activeBar={{
                fill: "hsl(var(--lime))",
                stroke: "hsl(var(--lime) / 0.45)",
                strokeWidth: 4,
              }}
              background={{ fill: "hsl(var(--secondary) / 0.5)", radius: 6 }}
            >
              {data.map((d, i) => (
                <Cell
                  key={d.day}
                  fill={i === data.length - 1 ? "hsl(var(--lime))" : "hsl(var(--lime) / 0.55)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
