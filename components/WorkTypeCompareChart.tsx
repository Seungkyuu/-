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

interface WorkTypeData {
  work_type: string;
  count: number;
  avg_estimated: number;
  avg_awarded: number;
}

interface Props {
  data: WorkTypeData[];
}

export default function WorkTypeCompareChart({ data }: Props) {
  const chartData = data.map((d) => ({
    name: d.work_type,
    추정가격억: Math.round(d.avg_estimated / 100_000_000 * 10) / 10,
    낙찰금액억: Math.round(d.avg_awarded / 100_000_000 * 10) / 10,
    건수: d.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v) => `${v}억`} tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value, name) => {
            const label = name === '추정가격억' ? '평균 추정가격' : '평균 낙찰금액';
            return [`${value}억원`, label];
          }}
        />
        <Legend />
        <Bar dataKey="추정가격억" fill="#93c5fd" radius={[4, 4, 0, 0]} name="평균 추정가격" />
        <Bar dataKey="낙찰금액억" fill="#3b82f6" radius={[4, 4, 0, 0]} name="평균 낙찰금액" />
      </BarChart>
    </ResponsiveContainer>
  );
}
