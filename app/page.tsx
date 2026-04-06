import { Suspense } from 'react';
import StatsCard from '@/components/StatsCard';
import InitButton from '@/components/InitButton';
import { formatPrice } from '@/lib/utils';
import DashboardCharts from './DashboardCharts';
import { WORK_TYPES } from '@/lib/constants';

async function getStats() {
  try {
    // 서버 컴포넌트에서 직접 DB 접근
    const { getDb } = await import('@/lib/db');
    const db = getDb();

    const workTypeStats = WORK_TYPES.map((wt) => {
      const row = db.prepare(
        `SELECT COUNT(*) as count, COALESCE(SUM(estimated_price), 0) as total FROM bids WHERE work_type = ?`
      ).get(wt) as { count: number; total: number };
      return { work_type: wt, count: row.count, total: row.total };
    });

    const monthlyStats = db.prepare(`
      SELECT CAST(strftime('%m', announced_at) AS INTEGER) as month,
        COUNT(*) as count, COALESCE(SUM(estimated_price), 0) as total
      FROM bids WHERE announced_at BETWEEN '2025-01-01' AND '2025-12-31'
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
    `).get() as { avg_lead_time: number | null };

    const currentMonth = new Date().getMonth() + 1;
    const alertAgencies = db.prepare(`
      SELECT DISTINCT agency, COUNT(*) as count, GROUP_CONCAT(title, ' | ') as titles
      FROM bids
      WHERE CAST(strftime('%m', announced_at) AS INTEGER) = ?
        AND announced_at BETWEEN '2025-01-01' AND '2025-12-31'
      GROUP BY agency ORDER BY count DESC LIMIT 10
    `).all(currentMonth) as Array<{ agency: string; count: number; titles: string }>;

    const totalRow = db.prepare(
      `SELECT COUNT(*) as total_count, COALESCE(SUM(estimated_price), 0) as total_amount FROM bids`
    ).get() as { total_count: number; total_amount: number };

    return {
      workTypeStats,
      monthlyData,
      avgLeadTime: ltRow.avg_lead_time ? Math.round(ltRow.avg_lead_time) : null,
      alertAgencies,
      totalCount: totalRow.total_count,
      totalAmount: totalRow.total_amount,
    };
  } catch {
    return null;
  }
}

const WORK_TYPE_COLORS = ['blue', 'green', 'purple', 'orange'] as const;

export default async function DashboardPage() {
  const stats = await getStats();
  const hasData = stats && stats.totalCount > 0;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">나라장터 사전영업 대시보드</h1>
          <p className="text-sm text-gray-500 mt-1">2025년 발주 데이터 기반 · 2026년 사전 영업 일정 수립 지원</p>
        </div>
        <InitButton />
      </div>

      {!hasData ? (
        <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50 p-12 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">데이터가 없습니다</h2>
          <p className="text-sm text-gray-500 mb-6">
            위의 <strong>&quot;샘플 데이터 초기화&quot;</strong> 버튼을 눌러 2025년 나라장터 시뮬레이션 데이터를 로드하거나,
            <br />
            <code className="bg-white px-1 py-0.5 rounded text-blue-600">.env.local</code>에 API 키 설정 후{' '}
            <code className="bg-white px-1 py-0.5 rounded text-blue-600">POST /api/collect</code>로 실제 데이터를 수집하세요.
          </p>
          <div className="text-xs text-gray-400 bg-white rounded-lg p-4 inline-block text-left">
            <p className="font-medium mb-2">빠른 시작</p>
            <p>1. &quot;샘플 데이터 초기화&quot; 클릭 → 즉시 사용 가능</p>
            <p>2. data.go.kr 에서 나라장터 API 키 신청 후 .env.local 설정</p>
            <p>3. POST /api/collect 호출로 실제 2025년 데이터 수집</p>
          </div>
        </div>
      ) : (
        <>
          {/* 전체 요약 카드 */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatsCard
              title="전체 발주 건수"
              value={`${stats.totalCount.toLocaleString()}건`}
              subtitle="2025년 전체"
              color="blue"
            />
            <StatsCard
              title="전체 발주 금액"
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
                  badge="2025"
                />
              ))}
            </div>
          </div>

          {/* 월별 차트 (Client Component) */}
          <Suspense fallback={<div className="h-80 bg-gray-100 rounded-xl animate-pulse" />}>
            <DashboardCharts monthlyData={stats.monthlyData} />
          </Suspense>

          {/* 이번달 주의 기관 */}
          {stats.alertAgencies.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-3">
                이번달 주의 기관
                <span className="text-sm font-normal text-gray-400 ml-2">
                  (작년 {new Date().getMonth() + 1}월에 발주한 기관)
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {stats.alertAgencies.map((ag) => (
                  <div
                    key={ag.agency}
                    className="bg-white rounded-xl border border-amber-200 p-4 hover:border-amber-400 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-800 text-sm">{ag.agency}</span>
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        {ag.count}건
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2">
                      {ag.titles?.split(' | ')[0] || '-'}
                    </p>
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
