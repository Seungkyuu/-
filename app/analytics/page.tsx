'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import HeatmapChart from '@/components/HeatmapChart';
import RecurringProjectsTable from '@/components/RecurringProjectsTable';
import { WORK_TYPES } from '@/lib/constants';
import type { RecurringProject } from '@/lib/recurring';

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

interface RecurringData {
  recurring: RecurringProject[];
  summary: {
    total: number;
    threeYearPlus: number;
    twoYear: number;
    sameWinner: number;
    winnerChanged: number;
    highAlert: number;
    mediumAlert: number;
  };
}

type ActiveTab = 'heatmap' | 'agency' | 'price' | 'leadtime' | 'recurring';

const YEAR_OPTIONS = ['2023', '2024', '2025'];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [recurringData, setRecurringData] = useState<RecurringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recurringLoading, setRecurringLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('heatmap');
  const [heatmapYear, setHeatmapYear] = useState('2025');

  useEffect(() => {
    fetch(`/api/analytics?year=${heatmapYear}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [heatmapYear]);

  useEffect(() => {
    if (activeTab === 'recurring' && !recurringData) {
      setRecurringLoading(true);
      fetch('/api/recurring')
        .then((r) => r.json())
        .then(setRecurringData)
        .catch(() => setRecurringData(null))
        .finally(() => setRecurringLoading(false));
    }
  }, [activeTab, recurringData]);

  const TABS: Array<{ key: ActiveTab; label: string; badge?: string }> = [
    { key: 'heatmap', label: '월별 히트맵' },
    { key: 'agency', label: '기관별 순위' },
    { key: 'price', label: '금액 비교' },
    { key: 'leadtime', label: '리드타임 분포' },
    { key: 'recurring', label: '연속사업 분석', badge: recurringData ? String(recurringData.summary.total) : undefined },
  ];

  if (loading && activeTab !== 'recurring') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">발주 패턴 분석</h1>
        {[1, 2].map((i) => <div key={i} className="h-80 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">발주 패턴 분석</h1>
        <p className="text-sm text-gray-500 mt-0.5">2023~2025년 나라장터 데이터 기반 패턴 분석</p>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === t.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {t.label}
            {t.badge && (
              <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'heatmap' && data && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-800">월별 업무구분별 발주 히트맵</h2>
              <p className="text-xs text-gray-400">셀의 숫자는 해당 월/업무구분 발주 건수</p>
            </div>
            <div className="flex gap-1">
              {YEAR_OPTIONS.map((y) => (
                <button key={y} onClick={() => setHeatmapYear(y)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium ${heatmapYear === y ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-500'}`}>
                  {y}년
                </button>
              ))}
            </div>
          </div>
          <HeatmapChart data={data.heatmapData} workTypes={[...WORK_TYPES]} />
        </div>
      )}

      {activeTab === 'agency' && data && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-1">기관별 발주금액 Top 20</h2>
          <p className="text-xs text-gray-400 mb-4">2025년 기준 발주금액 상위 기관</p>
          <AgencyRankingChart data={data.agencyRanking} />
        </div>
      )}

      {activeTab === 'price' && data && (
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
                  <th className="text-right py-2 text-gray-400">평균 낙찰률</th>
                </tr>
              </thead>
              <tbody>
                {data.workTypeAvg.map((wt) => (
                  <tr key={wt.work_type} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700 font-medium">{wt.work_type}</td>
                    <td className="py-2 text-right text-gray-600">{wt.count}건</td>
                    <td className="py-2 text-right text-gray-600">{Math.round(wt.avg_estimated / 1e8 * 10) / 10}억</td>
                    <td className="py-2 text-right text-gray-600">{Math.round(wt.avg_awarded / 1e8 * 10) / 10}억</td>
                    <td className="py-2 text-right text-gray-600">
                      {wt.avg_estimated > 0 ? Math.round(wt.avg_awarded / wt.avg_estimated * 100) : '-'}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'leadtime' && data && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-1">사전규격→입찰공고 리드타임 분포</h2>
          <p className="text-xs text-gray-400 mb-4">사전규격공고일부터 입찰공고일까지 소요 기간</p>
          <LeadTimeHistogram histogram={data.leadTimeHistogram} stats={data.leadTimeStats} />
        </div>
      )}

      {activeTab === 'recurring' && (
        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <h2 className="text-base font-semibold text-orange-800 mb-1">연속사업 분석</h2>
            <p className="text-xs text-orange-600">
              동일 기관에서 유사 사업명으로 2개년 이상 반복 발주된 사업을 자동 탐지합니다.
              <br />
              2년 연속 → 4년·6년 장기계약 가능성 검토, 낙찰업체 변경 이력으로 공략 기회 파악.
            </p>
          </div>

          {recurringLoading ? (
            <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
          ) : !recurringData ? (
            <p className="text-sm text-gray-400 text-center py-10">데이터를 불러올 수 없습니다.</p>
          ) : (
            <RecurringProjectsTable data={recurringData.recurring} summary={recurringData.summary} />
          )}
        </div>
      )}
    </div>
  );
}
