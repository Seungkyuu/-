import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { detectRecurring, type RecurringBid } from '@/lib/recurring';

export async function GET() {
  try {
    const db = getDb();

    // 전체 입찰 데이터 조회 (연도 제한 없음)
    const rows = db.prepare(`
      SELECT
        b.id, b.title, b.agency, b.work_type,
        b.announced_at, b.estimated_price, b.awarded_price, b.winner, b.url,
        CAST(strftime('%Y', b.announced_at) AS INTEGER) as year
      FROM bids b
      WHERE b.announced_at IS NOT NULL
      ORDER BY b.announced_at
    `).all() as (RecurringBid & { year: number })[];

    const recurring = detectRecurring(rows);

    // 요약 통계
    const total = recurring.length;
    const threeYearPlus = recurring.filter((r) => r.years.length >= 3).length;
    const twoYear = recurring.filter((r) => r.years.length === 2).length;
    const sameWinner = recurring.filter((r) => !r.winnerChanged).length;
    const winnerChanged = recurring.filter((r) => r.winnerChanged).length;
    const highAlert = recurring.filter((r) => r.alert === 'high').length;
    const mediumAlert = recurring.filter((r) => r.alert === 'medium').length;

    return NextResponse.json({
      recurring,
      summary: {
        total,
        threeYearPlus,
        twoYear,
        sameWinner,
        winnerChanged,
        highAlert,
        mediumAlert,
      },
    });
  } catch (error) {
    console.error('Recurring 오류:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
