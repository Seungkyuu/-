'use client';

import dynamic from 'next/dynamic';

const MonthlyBarChart = dynamic(() => import('@/components/MonthlyBarChart'), { ssr: false });

interface MonthlyData {
  month: number;
  count: number;
  total: number;
}

interface Props {
  monthlyData: MonthlyData[];
  year: string;
}

export default function DashboardCharts({ monthlyData, year }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-base font-semibold text-gray-800 mb-4">{year}년 월별 발주 현황</h2>
      <MonthlyBarChart data={monthlyData} />
    </div>
  );
}
