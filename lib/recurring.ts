/**
 * 연속사업 감지 로직
 * 동일 기관 + 유사 사업명이 복수 연도에 걸쳐 반복되는 사업을 탐지합니다.
 */

export function normalizeTitle(title: string): string {
  return title
    .replace(/20\d{2}년도?/g, '')     // 2023년, 2024년도
    .replace(/\d{4}년도?/g, '')       // 기타 연도
    .replace(/\d+차\s*/g, '')         // 1차, 2차
    .replace(/제\s*\d+\s*회/g, '')    // 제1회
    .replace(/\(\d{4}\)/g, '')        // (2023)
    .replace(/\[\d{4}\]/g, '')        // [2023]
    .replace(/연간\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface RecurringBid {
  id: string;
  year: number;
  title: string;
  announced_at: string | null;
  estimated_price: number | null;
  awarded_price: number | null;
  winner: string | null;
  work_type: string;
  url: string | null;
}

export interface RecurringProject {
  key: string;                   // agency + normalizedTitle
  normalizedTitle: string;
  agency: string;
  dept: string | null;
  work_type: string;
  years: number[];               // 출현 연도 목록 (정렬됨)
  bids: RecurringBid[];
  isConsecutive: boolean;        // 연속 연도에 출현하는지
  consecutiveYears: number;      // 최장 연속 기간
  estimatedCycle: number | null; // 예상 계약 주기 (년)
  priceTrend: 'up' | 'down' | 'stable' | 'unknown';
  priceChangeRate: number | null;  // 연평균 가격 변동률 (%)
  dominantWinner: string | null;   // 가장 많이 수주한 업체
  winnerChanged: boolean;          // 낙찰업체가 바뀐 적 있는지
  alert: 'high' | 'medium' | 'low'; // 영업 우선도
}

export function detectRecurring(bids: RecurringBid[]): RecurringProject[] {
  // 기관 + 정규화 제목으로 그룹화
  const groups = new Map<string, RecurringBid[]>();
  for (const bid of bids) {
    const normalized = normalizeTitle(bid.title);
    const key = `${bid.agency}|||${normalized}|||${bid.work_type}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(bid);
  }

  const result: RecurringProject[] = [];

  for (const [key, entries] of groups) {
    const years = [...new Set(entries.map((b) => b.year))].sort();
    if (years.length < 2) continue; // 1년만 있으면 연속사업 아님

    const [, normalized, workType] = key.split('|||');
    const sorted = entries.sort((a, b) => a.year - b.year || (a.announced_at || '').localeCompare(b.announced_at || ''));

    // 연속 연도 계산
    let maxConsecutive = 1;
    let currentConsecutive = 1;
    for (let i = 1; i < years.length; i++) {
      if (years[i] - years[i - 1] === 1) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 1;
      }
    }
    const isConsecutive = maxConsecutive >= 2;

    // 가격 추세
    const pricesWithYear = sorted
      .filter((b) => b.estimated_price != null)
      .map((b) => ({ year: b.year, price: b.estimated_price! }));

    let priceTrend: RecurringProject['priceTrend'] = 'unknown';
    let priceChangeRate: number | null = null;

    if (pricesWithYear.length >= 2) {
      const first = pricesWithYear[0];
      const last = pricesWithYear[pricesWithYear.length - 1];
      const yearDiff = last.year - first.year;
      if (yearDiff > 0) {
        const totalChange = (last.price - first.price) / first.price;
        priceChangeRate = Math.round((totalChange / yearDiff) * 1000) / 10; // 연평균 %
        if (Math.abs(priceChangeRate) < 3) priceTrend = 'stable';
        else if (priceChangeRate > 0) priceTrend = 'up';
        else priceTrend = 'down';
      }
    }

    // 낙찰업체 분석
    const winnerCounts = new Map<string, number>();
    for (const b of sorted) {
      if (b.winner) {
        winnerCounts.set(b.winner, (winnerCounts.get(b.winner) || 0) + 1);
      }
    }
    const dominantWinner = winnerCounts.size > 0
      ? [...winnerCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
      : null;
    const winnerChanged = winnerCounts.size > 1;

    // 예상 계약 주기 (출현 빈도로 추정)
    const estimatedCycle = years.length >= 2
      ? Math.round((years[years.length - 1] - years[0]) / (years.length - 1))
      : null;

    const consecutiveYears = maxConsecutive;

    // 영업 우선도
    // - 고: 연속 2년 이상 + 동일 낙찰업체 (경쟁사 방어 또는 교체 기회)
    // - 중: 연속 2년 + 낙찰업체 변경 (교체 기회)
    // - 저: 비연속 또는 단순 반복
    let alert: RecurringProject['alert'] = 'low';
    if (isConsecutive && consecutiveYears >= 2) {
      alert = winnerChanged ? 'medium' : 'high';
    } else if (years.length >= 2) {
      alert = 'medium';
    }

    result.push({
      key,
      normalizedTitle: normalized,
      agency: sorted[0].agency,
      dept: null,
      work_type: workType,
      years,
      bids: sorted,
      isConsecutive,
      consecutiveYears,
      estimatedCycle,
      priceTrend,
      priceChangeRate,
      dominantWinner,
      winnerChanged,
      alert,
    });
  }

  // 연속 기간 내림차순 → 출현 횟수 내림차순
  return result.sort((a, b) => {
    if (b.consecutiveYears !== a.consecutiveYears) return b.consecutiveYears - a.consecutiveYears;
    return b.years.length - a.years.length;
  });
}
