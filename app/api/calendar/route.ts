import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();

    // 2025년 데이터 기반 → 2026년 예상 발주 일정 생성
    const bids2025 = db.prepare(`
      SELECT
        b.id as bid_id,
        b.title,
        b.agency,
        b.dept,
        b.work_type,
        b.announced_at,
        b.estimated_price,
        b.awarded_price,
        b.winner,
        b.url,
        p.published_at as pre_spec_published_at,
        CAST(
          JULIANDAY(b.announced_at) - JULIANDAY(p.published_at)
        AS INTEGER) as lead_time,
        m.memo,
        m.status as memo_status
      FROM bids b
      LEFT JOIN pre_specs p ON b.pre_spec_id = p.id
      LEFT JOIN sales_memos m ON b.id = m.bid_id
      WHERE b.announced_at BETWEEN '2025-01-01' AND '2025-12-31'
      ORDER BY b.announced_at
    `).all() as Array<{
      bid_id: string;
      title: string;
      agency: string;
      dept: string | null;
      work_type: string;
      announced_at: string;
      estimated_price: number | null;
      awarded_price: number | null;
      winner: string | null;
      url: string | null;
      pre_spec_published_at: string | null;
      lead_time: number | null;
      memo: string | null;
      memo_status: string | null;
    }>;

    // 평균 리드타임 계산
    const validLeadTimes = bids2025
      .map((b) => b.lead_time)
      .filter((lt): lt is number => lt !== null && lt > 0);
    const avgLeadTime = validLeadTimes.length
      ? Math.round(validLeadTimes.reduce((a, b) => a + b, 0) / validLeadTimes.length)
      : 21; // 기본값 21일

    // 2026년 예상 발주 일정 생성
    const calendarEvents = bids2025.map((bid) => {
      // 예상 발주월 = 작년 입찰공고일의 월/일을 2026년으로
      const announced = new Date(bid.announced_at);
      const expectedBidDate = `2026-${String(announced.getMonth() + 1).padStart(2, '0')}-${String(announced.getDate()).padStart(2, '0')}`;

      // 예상 사전규격공고일 = 예상 발주일 - 평균 리드타임
      const preSpecDate = new Date(expectedBidDate);
      preSpecDate.setDate(preSpecDate.getDate() - avgLeadTime);
      const expectedPreSpecDate = `${preSpecDate.getFullYear()}-${String(preSpecDate.getMonth() + 1).padStart(2, '0')}-${String(preSpecDate.getDate()).padStart(2, '0')}`;

      // 영업 알림 상태 계산
      const today = new Date();
      const preSpecDays = Math.ceil(
        (preSpecDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      let alertStatus: 'normal' | 'prepare' | 'action' | 'past' = 'normal';
      if (preSpecDays < 0) {
        alertStatus = 'past';
      } else if (preSpecDays <= 7) {
        alertStatus = 'action';
      } else if (preSpecDays <= 30) {
        alertStatus = 'prepare';
      }

      return {
        bid_id: bid.bid_id,
        title: bid.title,
        agency: bid.agency,
        dept: bid.dept,
        work_type: bid.work_type,
        // 2026년 예상 날짜
        expected_bid_date: expectedBidDate,
        expected_pre_spec_date: expectedPreSpecDate,
        // 2025년 실적
        prev_announced_at: bid.announced_at,
        prev_estimated_price: bid.estimated_price,
        prev_awarded_price: bid.awarded_price,
        prev_winner: bid.winner,
        // 영업 메모
        memo: bid.memo,
        memo_status: bid.memo_status,
        // 알림 상태
        alert_status: alertStatus,
        days_until_pre_spec: preSpecDays,
        avg_lead_time: avgLeadTime,
        url: bid.url,
      };
    });

    // 월별로 그룹화
    const byMonth: Record<number, typeof calendarEvents> = {};
    for (let m = 1; m <= 12; m++) {
      byMonth[m] = calendarEvents.filter((e) => {
        const month = parseInt(e.expected_bid_date.slice(5, 7));
        return month === m;
      });
    }

    return NextResponse.json({
      events: calendarEvents,
      byMonth,
      avgLeadTime,
      totalEvents: calendarEvents.length,
    });
  } catch (error) {
    console.error('Calendar 오류:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
