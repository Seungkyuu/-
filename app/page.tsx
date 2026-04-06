import { Suspense } from 'react';
import StatsCard from '@/components/StatsCard';
import InitButton from '@/components/InitButton';
import { formatPrice } from '@/lib/utils';
import { WORK_TYPES } from '@/lib/constants';
import DashboardCharts from './DashboardCharts';

async function getStats(year: string) {
  try {
    const { getDb } = await import('@/lib/db');
    const db = getDb();
    const yearStr = String(parseInt(year));

    const workTypeStats = WORK_TYPES.map((wt) => {
      const row = db.prepare(
        `SELECT COUNT(*) as count, COALESCE(SUM(estimated_price), 0) as total
         FROM bids WHERE work_type = ? AND announced_at LIKE '${yearStr}%'`
      ).get(wt) as { count: number; total: number };
      return { work_type: wt, count: row.count, total: row.total };
    });

    const monthlyStats = db.prepare(`
      SELECT CAST(strftime('%m', announced_at) AS INTEGER) as month,
        COUNT(*) as count, COALESCE(SUM(estimated_price), 0) as total
      FROM bids WHERE announced_at LIKE '${yearStr}%'
      GROUP BY month ORDER BY month
    `).all() as Array<{ month: number; count: number; total: number }>;

    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const found = monthlyStats.find((m) => m.month === i + 1);
      return { month: i + 1, count: found?.count || 0, total: found?.total || 0 };
    });

    const ltRow = db.prepare(`
      SELECT AVG(JULIANDAY(b.announced_at) - JULIANDAY(p.published_at)) as avg_lead_time
      FROM bids b JOIN pre_specs p ON b.pre_spec_id = p.id
      WHERE b.announced_at IS NOT NULL AND p.published_at IS NOT NULL
        AND b.announced_at LIKE '${yearStr}%'
    `).get() as { avg_lead_time: number | null };

    const currentMonth = new Date().getMonth() + 1;
    const alertAgencies = db.prepare(`
      SELECT DISTINCT agency, COUNT(*) as count, GROUP_CONCAT(title, ' | ') as titles
      FROM bids
      WHERE CAST(strftime('%m', announced_at) AS INTEGER) = ?
        AND announced_at LIKE '${yearStr}%'
      GROUP BY agency ORDER BY count DESC LIMIT 10
    `).all(currentMonth) as Array<{ agency: string; count: number; titles: string }>;

    const totalRow = db.prepare(`
      SELECT COUNT(*) as total_count, COALESCE(SUM(estimated_price), 0) as total_amount
      FROM bids WHERE announced_at LIKE '${yearStr}%'
    `).get() as { total_count: number; total_amount: number };

    // 연도별 요약 (다년간 비교)
    const yearSummary = db.prepare(`
      SELECT strftime('%Y', announced_at) as y,
        COUNT(*) as count, COALESCE(SUM(estimated_price), 0) as total
      FROM bids GROUP BY y ORDER BY y
    `).all() as Array<{ y: string; count: number; total: number }>;

    return {
      year: yearStr,
      workTypeStats,
      monthlyData,
      avgLeadTime: ltRow.avg_lead_time ? Math.round(ltRow.avg_lead_time) : null,
      alertAgencies,
      totalCount: totalRow.total_count,
      totalAmount: totalRow.total_amount,
      yearSummary,
    };
  } catch {
    return null;
  }
}

const WORK_TYPE_COLORS = ['blue', 'green', 'purple', 'orange'] as const;

interface Props {
  searchParams: Promise<{ year?: string }>;
}

export default async function DashboardPage({ searchParams }: Props) {
  const params = await searchParams;
  const selectedYear = params.year || '2025';
  const stats = await getStats(selectedYear);
  const hasData = stats && stats.totalCount > 0;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">나라장터 사전영업 대시보드</h1>
          <p className="text-sm text-gray-500 mt-1">2023~2025년 발주 데이터 기반 · 2026년 사전 영업 일정 수립 지원</p>
        </div>
        <InitButton />
      </div>

      {!hasData ? (
        <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50 p-12 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">데이터가 없습니다</h2>
          <p className="text-sm text-gray-500 mb-6">
            위의 <strong>&quot;샘플 데이터 초기화&quot;</strong> 버튼을 눌러 2023~2025년 나라장터 시뮬레이션 데이터를 로드하세요.
            <br />
            실제 데이터: <code className="bg-white px-1 py-0.5 rounded text-blue-600">.env.local</code>에 API 키 설정 후{' '}
            <code className="bg-white px-1 py-0.5 rounded text-blue-600">POST /api/collect?years=2023,2024,2025</code>
          </p>
        </div>
      ) : (
        <>
          {/* 연도별 요약 카드 (다년간) */}
          {stats.yearSummary && stats.yearSummary.length > 1 && (
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-3">연도별 발주 현황</h2>
              <div className="grid grid-cols-3 gap-3">
                {stats.yearSummary.map((ys) => (
                  <a key={ys.y} href={`/?year=${ys.y}`}
                    className={`rounded-xl border p-4 transition-all hover:shadow-md ${
                      selectedYear === ys.y
                        ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 bg-white hover:border-blue-200'
                    }`}>
                    <p className="text-xs text-gray-400 mb-1">{ys.y}년</p>
                    <p className="text-xl font-bold text-gray-900">{ys.count.toLocaleString()}건</p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatPrice(ys.total)}</p>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* 선택 연도 요약 */}
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              {selectedYear}년 요약
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatsCard
                title="발주 건수"
                value={`${stats.totalCount.toLocaleString()}건`}
                subtitle={`${selectedYear}년 전체`}
                color="blue"
              />
              <StatsCard
                title="발주 금액"
                value={formatPrice(stats.totalAmount)}
                subtitle="추정가격 합계"
                color="green"
              />
              <StatsCard
                title="평균 리드타임"
                value={stats.avgLeadTime != null ? `${stats.avgLeadTime}일` : '-'}
                subtitle="사전규격→입찰공고"
                color="purple"
              />
            </div>
          </div>

          {/* 업무구분별 카드 */}
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-3">업무구분별 현황</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.workTypeStats.map((wt, idx) => (
                <StatsCard
                  key={wt.work_type}
                  title={wt.work_type}
                  value={`${wt.count}건`}
                  subtitle={formatPrice(wt.total)}
                  color={WORK_TYPE_COLORS[idx] || 'gray'}
                  badge={selectedYear}
                />
              ))}
            </div>
          </div>

          {/* 월별 차트 */}
          <Suspense fallback={<div className="h-80 bg-gray-100 rounded-xl animate-pulse" />}>
            <DashboardCharts monthlyData={stats.monthlyData} year={selectedYear} />
          </Suspense>

          {/* 이번달 주의 기관 */}
          {stats.alertAgencies.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-3">
                이번달 주의 기관
                <span className="text-sm font-normal text-gray-400 ml-2">
                  ({selectedYear}년 {new Date().getMonth() + 1}월 발주 기관)
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {stats.alertAgencies.map((ag) => (
                  <div key={ag.agency}
                    className="bg-white rounded-xl border border-amber-200 p-4 hover:border-amber-400 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-800 text-sm">{ag.agency}</span>
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{ag.count}건</span>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2">{ag.titles?.split(' | ')[0] || '-'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
