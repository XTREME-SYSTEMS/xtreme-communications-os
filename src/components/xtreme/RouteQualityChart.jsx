import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

export default function RouteQualityChart({ data }) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 32% 17%)" />
          <XAxis dataKey="channel" tick={{ fill: "hsl(215 16% 47%)", fontSize: 10 }} stroke="hsl(217 32% 17%)" />
          <YAxis yAxisId="left" tick={{ fill: "hsl(215 16% 47%)", fontSize: 10 }} stroke="hsl(217 32% 17%)" />
          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: "hsl(215 16% 47%)", fontSize: 10 }} stroke="hsl(217 32% 17%)" />
          <Tooltip
            contentStyle={{ background: "hsl(222 38% 11%)", border: "1px solid hsl(217 32% 17%)", borderRadius: 6, fontSize: 11 }}
            labelStyle={{ color: "hsl(210 40% 98%)" }}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar yAxisId="left" dataKey="latency" name="Latency (ms)" fill="hsl(20 100% 50%)" radius={[2, 2, 0, 0]} />
          <Bar yAxisId="right" dataKey="success" name="Success %" fill="hsl(151 100% 45%)" radius={[2, 2, 0, 0]} />
          <Bar yAxisId="left" dataKey="anomalies" name="Anomalies" fill="hsl(0 84% 60%)" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}