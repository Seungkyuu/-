'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import HeatmapChart from '@/components/HeatmapChart';
import { WORK_TYPES } from '@/lib/constants';

const AgencyRankingChart = dynamic(() => import('@/components/AgencyRankingChart'), { ssr: false });
const WorkTypeCompareChart = dynamic(() => import('@/components/WorkTypeCompareChart'), { ssr: false });
const LeadTimeHistogram = dynamic(() => import('@/components/LeadTimeHistogram'), { ssr: false });

interface AnalyticsData {
  heatmapData: Array<{ month: number; work_type: string; count: number; total: number }>;
  agencyRanking: Array<{ agency: string; count: number; total_price: number; avg_price: number }>;
  workTypeAvg: Array<{ work_type: string; count: number; avg_estimated: number; avg_awarded: number }>;
  leadTimeHistogram: Array<{ label: string; count: number }>;
  leadTimeStats: { min: number; max: number; avg: number; median: number };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">발주 패턴 분석</h1>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-80 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-gray-400">
        데이터를 불러올 수 없습니다. 대시보드에서 데이터를 초기화하세요.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">발주 패턴 분석</h1>
        <p className="text-sm text-gray-500 mt-0.5">2025년 나라장터 데이터 기반 패턴 분석</p>
      </div>

      {/* 월별 히트맵 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-1">월별 업무구분별 발주 히트맵</h2>
        <p className="text-xs text-gray-400 mb-4">셀의 숫자는 해당 월/업무구분 발주 건수</p>
        <HeatmapChart data={data.heatmapData} workTypes={[...WORK_TYPES]} />
      </div>

      {/* 기관별 순위 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-1">기관별 발주금액 Top 20</h2>
        <p className="text-xs text-gray-400 mb-4">발주금액 기준 상위 20개 기관</p>
        <AgencyRankingChart data={data.agencyRanking} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 업무구분별 평균 금액 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-1">업무구분별 평균 계약금액</h2>
          <p className="text-xs text-gray-400 mb-4">추정가격 vs 낙찰금액 비교</p>
          <WorkTypeCompareChart data={data.workTypeAvg} />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-gray-400">업무구분</th>
                  <th className="text-right py-2 text-gray-400">건수</th>
                  <th className="text-right py-2 text-gray-400">평균 추정가격</th>
                  <th className="text-right py-2 text-gray-400">평균 낙찰금액</th>
                </tr>
              </thead>
              <tbody>
                {data.workTypeAvg.map((wt) => (
                  <tr key={wt.work_type} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700 font-medium">{wt.work_type}</td>
                    <td className="py-2 text-right text-gray-600">{wt.count}건</td>
                    <td className="py-2 text-right text-gray-600">
                      {Math.round(wt.avg_estimated / 100_000_000 * 10) / 10}억
                    </td>
                    <td className="py-2 text-right text-gray-600">
                      {Math.round(wt.avg_awarded / 100_000_000 * 10) / 10}억
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 리드타임 분포 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-1">사전규격→입찰공고 리드타임 분포</h2>
          <p className="text-xs text-gray-400 mb-4">사전규격공고일부터 입찰공고일까지 소요 기간</p>
          <LeadTimeHistogram
            histogram={data.leadTimeHistogram}
            stats={data.leadTimeStats}
          />
        </div>
      </div>
    </div>
  );
}
