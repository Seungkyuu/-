import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { WORK_TYPES } from '@/lib/constants';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const year = new URL(req.url).searchParams.get('year') || '2025';
    const yearStr = String(parseInt(year));

    // 업무구분별 건수 및 총액
    const workTypeStats = WORK_TYPES.map((wt) => {
      const row = db.prepare(`
        SELECT COUNT(*) as count, COALESCE(SUM(estimated_price), 0) as total
        FROM bids WHERE work_type = ? AND announced_at LIKE '${yearStr}%'
      `).get(wt) as { count: number; total: number };
      return { work_type: wt, count: row.count, total: row.total };
    });

    // 월별 발주 건수
    const monthlyStats = db.prepare(`
      SELECT
        CAST(strftime('%m', announced_at) AS INTEGER) as month,
        COUNT(*) as count,
        COALESCE(SUM(estimated_price), 0) as total
      FROM bids
      WHERE announced_at LIKE '${yearStr}%'
      GROUP BY month ORDER BY month
    `).all() as Array<{ month: number; count: number; total: number }>;

    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const found = monthlyStats.find((m) => m.month === i + 1);
      return { month: i + 1, count: found?.count || 0, total: found?.total || 0 };
    });

    // 평균 리드타임
    const ltRow = db.prepare(`
      SELECT AVG(JULIANDAY(b.announced_at) - JULIANDAY(p.published_at)) as avg_lead_time
      FROM bids b JOIN pre_specs p ON b.pre_spec_id = p.id
      WHERE b.announced_at IS NOT NULL AND p.published_at IS NOT NULL
        AND b.announced_at LIKE '${yearStr}%'
    `).get() as { avg_lead_time: number | null };

    // 이번달 주의 기관
    const currentMonth = new Date().getMonth() + 1;
    const alertAgencies = db.prepare(`
      SELECT DISTINCT agency, COUNT(*) as count, GROUP_CONCAT(title, ' | ') as titles
      FROM bids
      WHERE CAST(strftime('%m', announced_at) AS INTEGER) = ?
        AND announced_at LIKE '${yearStr}%'
      GROUP BY agency ORDER BY count DESC LIMIT 10
    `).all(currentMonth) as Array<{ agency: string; count: number; titles: string }>;

    // 전체 집계
    const totalRow = db.prepare(`
      SELECT COUNT(*) as total_count, COALESCE(SUM(estimated_price), 0) as total_amount
      FROM bids WHERE announced_at LIKE '${yearStr}%'
    `).get() as { total_count: number; total_amount: number };

    // 연도별 전체 현황 (멀티이어 요약)
    const yearSummary = db.prepare(`
      SELECT strftime('%Y', announced_at) as y,
        COUNT(*) as count, COALESCE(SUM(estimated_price), 0) as total
      FROM bids GROUP BY y ORDER BY y
    `).all() as Array<{ y: string; count: number; total: number }>;

    return NextResponse.json({
      year: yearStr,
      workTypeStats,
      monthlyData,
      avgLeadTime: ltRow.avg_lead_time ? Math.round(ltRow.avg_lead_time) : null,
      alertAgencies,
      totalCount: totalRow.total_count,
      totalAmount: totalRow.total_amount,
      yearSummary,
    });
  } catch (error) {
    console.error('Stats 오류:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
