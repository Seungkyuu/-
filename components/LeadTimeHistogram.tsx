'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface BucketData {
  label: string;
  count: number;
}

interface Stats {
  min: number;
  max: number;
  avg: number;
  median: number;
}

interface Props {
  histogram: BucketData[];
  stats: Stats;
}

const COLORS = ['#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#1d4ed8'];

export default function LeadTimeHistogram({ histogram, stats }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3 text-center">
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs text-gray-400">최소</p>
          <p className="text-lg font-bold text-blue-700">{stats.min}일</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs text-gray-400">평균</p>
          <p className="text-lg font-bold text-blue-700">{stats.avg}일</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs text-gray-400">중앙값</p>
          <p className="text-lg font-bold text-blue-700">{stats.median}일</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs text-gray-400">최대</p>
          <p className="text-lg font-bold text-blue-700">{stats.max}일</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={histogram} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value) => [value, '건수']} />
          <Bar dataKey="count" name="건수" radius={[4, 4, 0, 0]}>
            {histogram.map((_, idx) => (
              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
