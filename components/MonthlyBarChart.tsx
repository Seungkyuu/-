'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface MonthlyData {
  month: number;
  count: number;
  total: number;
}

interface Props {
  data: MonthlyData[];
}

export default function MonthlyBarChart({ data }: Props) {
  const chartData = data.map((d) => ({
    name: `${d.month}월`,
    건수: d.count,
    금액억: Math.round(d.total / 100_000_000),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => `${v}억`}
        />
        <Tooltip
          formatter={(value, name) => {
            if (name === '금액억') return [`${value}억원`, '발주금액'];
            return [value, '발주건수'];
          }}
        />
        <Legend />
        <Bar yAxisId="left" dataKey="건수" fill="#3b82f6" radius={[4, 4, 0, 0]} name="발주건수" />
        <Bar yAxisId="right" dataKey="금액억" fill="#93c5fd" radius={[4, 4, 0, 0]} name="발주금액(억)" />
      </BarChart>
    </ResponsiveContainer>
  );
}
