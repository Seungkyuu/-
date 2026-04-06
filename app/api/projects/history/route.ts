import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { normalizeTitle } from '@/lib/recurring';

// GET /api/projects/history?agency=XXX&title=XXX
// 동일 기관의 유사 사업 연도별 이력 반환
export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const agency = searchParams.get('agency') || '';
    const title = searchParams.get('title') || '';

    if (!agency || !title) {
      return NextResponse.json({ error: 'agency, title 파라미터 필요' }, { status: 400 });
    }

    const normalizedTarget = normalizeTitle(title);

    // 동일 기관의 전체 입찰 조회
    const agencyBids = db.prepare(`
      SELECT
        b.id, b.title, b.agency, b.dept, b.work_type,
        b.announced_at, b.deadline_at, b.contract_at,
        b.estimated_price, b.awarded_price, b.winner, b.url,
        b.pre_spec_id,
        p.published_at as pre_spec_published_at,
        CAST(strftime('%Y', b.announced_at) AS INTEGER) as year,
        CAST(
          JULIANDAY(b.announced_at) - JULIANDAY(p.published_at)
        AS INTEGER) as lead_time,
        m.memo, m.status as memo_status
      FROM bids b
      LEFT JOIN pre_specs p ON b.pre_spec_id = p.id
      LEFT JOIN sales_memos m ON b.id = m.bid_id
      WHERE b.agency = ?
      ORDER BY b.announced_at
    `).all(agency) as Array<{
      id: string;
      title: string;
      agency: string;
      dept: string | null;
      work_type: string;
      announced_at: string;
      deadline_at: string | null;
      contract_at: string | null;
      estimated_price: number | null;
      awarded_price: number | null;
      winner: string | null;
      url: string | null;
      pre_spec_id: string | null;
      pre_spec_published_at: string | null;
      year: number;
      lead_time: number | null;
      memo: string | null;
      memo_status: string | null;
    }>;

    // 유사 제목 필터링 (정규화 후 포함 관계 확인)
    const related = agencyBids.filter((b) => {
      const normalized = normalizeTitle(b.title);
      // 정규화된 제목이 동일하거나 핵심 키워드가 70% 이상 일치
      if (normalized === normalizedTarget) return true;

      const targetWords = new Set(normalizedTarget.split(/\s+/).filter((w) => w.length >= 2));
      const candidateWords = new Set(normalized.split(/\s+/).filter((w) => w.length >= 2));

      if (targetWords.size === 0) return false;
      let matchCount = 0;
      for (const w of targetWords) {
        if (candidateWords.has(w)) matchCount++;
      }
      return matchCount / targetWords.size >= 0.6;
    });

    // 연도별 가격 추세 계산
    const pricesWithYear = related
      .filter((b) => b.estimated_price != null)
      .map((b) => ({ year: b.year, price: b.estimated_price! }));

    let priceTrend = '데이터 없음';
    let annualChangeRate: number | null = null;
    if (pricesWithYear.length >= 2) {
      const first = pricesWithYear[0];
      const last = pricesWithYear[pricesWithYear.length - 1];
      const yearDiff = last.year - first.year;
      if (yearDiff > 0) {
        const rate = ((last.price - first.price) / first.price / yearDiff) * 100;
        annualChangeRate = Math.round(rate * 10) / 10;
        priceTrend = rate > 3 ? '상승' : rate < -3 ? '하락' : '안정';
      }
    }

    // 낙찰업체 분석
    const winnerMap = new Map<string, number>();
    for (const b of related) {
      if (b.winner) winnerMap.set(b.winner, (winnerMap.get(b.winner) || 0) + 1);
    }
    const winnerRanking = [...winnerMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([winner, count]) => ({ winner, count }));

    return NextResponse.json({
      agency,
      normalizedTitle: normalizedTarget,
      relatedCount: related.length,
      history: related,
      years: [...new Set(related.map((b) => b.year))].sort(),
      priceTrend,
      annualChangeRate,
      winnerRanking,
      isRecurring: related.length >= 2,
    });
  } catch (error) {
    console.error('History 오류:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
