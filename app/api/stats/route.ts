import { NextResponse } from 'next/server';
import { getDb, WORK_TYPES } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();

    // 업무구분별 건수 및 총액
    const workTypeStats = WORK_TYPES.map((wt) => {
      const row = db.prepare(`
        SELECT COUNT(*) as count, COALESCE(SUM(estimated_price), 0) as total
        FROM bids WHERE work_type = ?
      `).get(wt) as { count: number; total: number };
      return { work_type: wt, count: row.count, total: row.total };
    });

    // 월별 발주 건수 (2025년)
    const monthlyStats = db.prepare(`
      SELECT
        CAST(strftime('%m', announced_at) AS INTEGER) as month,
        COUNT(*) as count,
        COALESCE(SUM(estimated_price), 0) as total
      FROM bids
      WHERE announced_at BETWEEN '2025-01-01' AND '2025-12-31'
      GROUP BY month
      ORDER BY month
    `).all() as Array<{ month: number; count: number; total: number }>;

    // 전체 월별 배열 (1~12월, 데이터 없으면 0)
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const found = monthlyStats.find((m) => m.month === i + 1);
      return { month: i + 1, count: found?.count || 0, total: found?.total || 0 };
    });

    // 평균 리드타임 (사전규격 → 입찰공고)
    const leadTimeRow = db.prepare(`
      SELECT AVG(
        JULIANDAY(b.announced_at) - JULIANDAY(p.published_at)
      ) as avg_lead_time
      FROM bids b
      JOIN pre_specs p ON b.pre_spec_id = p.id
      WHERE b.announced_at IS NOT NULL AND p.published_at IS NOT NULL
    `).get() as { avg_lead_time: number | null };

    const avgLeadTime = leadTimeRow.avg_lead_time
      ? Math.round(leadTimeRow.avg_lead_time)
      : null;

    // 이번달 주의 기관 (작년 동월 발주 기관)
    const currentMonth = new Date().getMonth() + 1;
    const alertAgencies = db.prepare(`
      SELECT DISTINCT agency, COUNT(*) as count,
        GROUP_CONCAT(title, ' | ') as titles
      FROM bids
      WHERE CAST(strftime('%m', announced_at) AS INTEGER) = ?
        AND announced_at BETWEEN '2025-01-01' AND '2025-12-31'
      GROUP BY agency
      ORDER BY count DESC
      LIMIT 10
    `).all(currentMonth) as Array<{ agency: string; count: number; titles: string }>;

    // 총 집계
    const totalRow = db.prepare(`
      SELECT COUNT(*) as total_count, COALESCE(SUM(estimated_price), 0) as total_amount
      FROM bids
    `).get() as { total_count: number; total_amount: number };

    return NextResponse.json({
      workTypeStats,
      monthlyData,
      avgLeadTime,
      alertAgencies,
      totalCount: totalRow.total_count,
      totalAmount: totalRow.total_amount,
    });
  } catch (error) {
    console.error('Stats 오류:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
