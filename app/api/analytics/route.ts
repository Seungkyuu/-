import { NextResponse } from 'next/server';
import { getDb, WORK_TYPES } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();

    // 월별 × 업무구분 히트맵 데이터
    const heatmapData: Array<{ month: number; work_type: string; count: number; total: number }> = [];
    for (const wt of WORK_TYPES) {
      const rows = db.prepare(`
        SELECT
          CAST(strftime('%m', announced_at) AS INTEGER) as month,
          COUNT(*) as count,
          COALESCE(SUM(estimated_price), 0) as total
        FROM bids
        WHERE work_type = ?
          AND announced_at BETWEEN '2025-01-01' AND '2025-12-31'
        GROUP BY month
        ORDER BY month
      `).all(wt) as Array<{ month: number; count: number; total: number }>;

      for (let m = 1; m <= 12; m++) {
        const found = rows.find((r) => r.month === m);
        heatmapData.push({
          month: m,
          work_type: wt,
          count: found?.count || 0,
          total: found?.total || 0,
        });
      }
    }

    // 기관별 발주금액 Top 20
    const agencyRanking = db.prepare(`
      SELECT
        agency,
        COUNT(*) as count,
        COALESCE(SUM(estimated_price), 0) as total_price,
        COALESCE(AVG(estimated_price), 0) as avg_price
      FROM bids
      WHERE announced_at BETWEEN '2025-01-01' AND '2025-12-31'
      GROUP BY agency
      ORDER BY total_price DESC
      LIMIT 20
    `).all() as Array<{ agency: string; count: number; total_price: number; avg_price: number }>;

    // 업무구분별 평균 계약금액
    const workTypeAvg = WORK_TYPES.map((wt) => {
      const row = db.prepare(`
        SELECT
          COUNT(*) as count,
          COALESCE(AVG(estimated_price), 0) as avg_estimated,
          COALESCE(AVG(awarded_price), 0) as avg_awarded
        FROM bids
        WHERE work_type = ?
          AND announced_at BETWEEN '2025-01-01' AND '2025-12-31'
      `).get(wt) as { count: number; avg_estimated: number; avg_awarded: number };
      return { work_type: wt, ...row };
    });

    // 리드타임 분포 (히스토그램용 버킷)
    const leadTimeRows = db.prepare(`
      SELECT
        CAST(JULIANDAY(b.announced_at) - JULIANDAY(p.published_at) AS INTEGER) as lead_time
      FROM bids b
      JOIN pre_specs p ON b.pre_spec_id = p.id
      WHERE b.announced_at IS NOT NULL AND p.published_at IS NOT NULL
        AND b.announced_at BETWEEN '2025-01-01' AND '2025-12-31'
    `).all() as Array<{ lead_time: number }>;

    // 버킷: 0-7, 8-14, 15-21, 22-30, 31+
    const buckets = [
      { label: '0-7일', min: 0, max: 7 },
      { label: '8-14일', min: 8, max: 14 },
      { label: '15-21일', min: 15, max: 21 },
      { label: '22-30일', min: 22, max: 30 },
      { label: '31일 이상', min: 31, max: Infinity },
    ];

    const leadTimeHistogram = buckets.map((b) => ({
      label: b.label,
      count: leadTimeRows.filter((r) => r.lead_time >= b.min && r.lead_time <= b.max).length,
    }));

    // 리드타임 통계
    const leadTimes = leadTimeRows.map((r) => r.lead_time).filter((lt) => lt >= 0);
    const ltStats = leadTimes.length
      ? {
          min: Math.min(...leadTimes),
          max: Math.max(...leadTimes),
          avg: Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length),
          median: leadTimes.sort((a, b) => a - b)[Math.floor(leadTimes.length / 2)],
        }
      : { min: 0, max: 0, avg: 0, median: 0 };

    return NextResponse.json({
      heatmapData,
      agencyRanking,
      workTypeAvg,
      leadTimeHistogram,
      leadTimeStats: ltStats,
    });
  } catch (error) {
    console.error('Analytics 오류:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
