'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface AgencyData {
  agency: string;
  count: number;
  total_price: number;
  avg_price: number;
}

interface Props {
  data: AgencyData[];
}

export default function AgencyRankingChart({ data }: Props) {
  const chartData = data.map((d) => ({
    name: d.agency.length > 8 ? d.agency.slice(0, 8) + '…' : d.agency,
    fullName: d.agency,
    금액억: Math.round(d.total_price / 100_000_000),
    건수: d.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={380}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => `${v}억`}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11 }}
          width={90}
        />
        <Tooltip
          formatter={(value, name) => {
            if (name === '금액억') return [`${value}억원`, '총 발주금액'];
            return [value, '발주건수'];
          }}
          labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
        />
        <Bar dataKey="금액억" fill="#3b82f6" radius={[0, 4, 4, 0]} name="총 발주금액" />
      </BarChart>
    </ResponsiveContainer>
  );
}
