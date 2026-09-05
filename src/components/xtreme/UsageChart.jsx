import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function UsageChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 32% 17%)" />
        <XAxis dataKey="channel" tick={{ fill: "hsl(215 16% 47%)", fontSize: 10 }} />
        <YAxis tick={{ fill: "hsl(215 16% 47%)", fontSize: 10 }} />
        <Tooltip cursor={{ fill: "hsl(217 32% 17% / 0.3)" }}
          contentStyle={{ background: "hsl(222 38% 11%)", border: "1px solid hsl(217 32% 17%)", fontSize: 11 }} />
        <Bar dataKey="cents" fill="hsl(20 100% 50%)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}