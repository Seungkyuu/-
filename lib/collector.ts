/**
 * 공공데이터포털 나라장터 API 수집기
 * API 키가 없는 경우 시드 데이터만 사용합니다.
 *
 * 참고 API:
 * - 입찰공고: https://apis.data.go.kr/1230000/BidPublicInfoService04/getBidPblancListInfoServc04
 * - 사전규격공고: https://apis.data.go.kr/1230000/BidPublicInfoService04/getPreSpcPublicListInfoServc
 */

import { getDb, WORK_TYPES } from './db';

const BASE_URL = 'https://apis.data.go.kr/1230000/BidPublicInfoService04';
const API_KEY = process.env.PUBLIC_DATA_API_KEY;

// 업무구분 코드 매핑 (나라장터 API 기준)
const WORK_TYPE_CODES: Record<string, string> = {
  '일반용역': '4',  // 용역
  '기술용역': '4',  // 용역 (기술)
  '기타': '5',
  '민간': '5',
};

interface G2BItem {
  bidNtceNo?: string;
  bidNtceNm?: string;
  ntceInsttNm?: string;
  dminsttNm?: string;
  bidNtceDt?: string;
  bidClseDt?: string;
  presmptPrce?: string;
  drwtPrce?: string;
  sucsfbidCorpNm?: string;
  ntceSpecFileUrl?: string;
  bidClseYmd?: string;
  cntrctCnclsYmd?: string;
  wghtdAvgPrce?: string;
}

async function fetchBidList(
  startDate: string,
  endDate: string,
  pageNo: number = 1
): Promise<{ items: G2BItem[]; totalCount: number }> {
  if (!API_KEY) {
    return { items: [], totalCount: 0 };
  }

  const params = new URLSearchParams({
    serviceKey: API_KEY,
    numOfRows: '100',
    pageNo: String(pageNo),
    type: 'json',
    inqryDiv: '1',
    inqryBgnDt: startDate.replace(/-/g, '') + '0000',
    inqryEndDt: endDate.replace(/-/g, '') + '2359',
  });

  const url = `${BASE_URL}/getBidPblancListInfoServc04?${params}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });

  if (!res.ok) throw new Error(`API 요청 실패: ${res.status}`);

  const data = await res.json();
  const response = data?.response;
  const body = response?.body;

  if (!body) return { items: [], totalCount: 0 };

  const items = Array.isArray(body.items?.item)
    ? body.items.item
    : body.items?.item
    ? [body.items.item]
    : [];

  return { items, totalCount: body.totalCount || 0 };
}

async function fetchPreSpecList(
  startDate: string,
  endDate: string,
  pageNo: number = 1
): Promise<{ items: G2BItem[]; totalCount: number }> {
  if (!API_KEY) {
    return { items: [], totalCount: 0 };
  }

  const params = new URLSearchParams({
    serviceKey: API_KEY,
    numOfRows: '100',
    pageNo: String(pageNo),
    type: 'json',
    inqryBgnDt: startDate.replace(/-/g, '') + '0000',
    inqryEndDt: endDate.replace(/-/g, '') + '2359',
  });

  const url = `${BASE_URL}/getPreSpcPublicListInfoServc?${params}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });

  if (!res.ok) throw new Error(`사전규격 API 요청 실패: ${res.status}`);

  const data = await res.json();
  const body = data?.response?.body;
  if (!body) return { items: [], totalCount: 0 };

  const items = Array.isArray(body.items?.item)
    ? body.items.item
    : body.items?.item
    ? [body.items.item]
    : [];

  return { items, totalCount: body.totalCount || 0 };
}

function detectWorkType(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('기술') || t.includes('컨설팅') || t.includes('연구')) return '기술용역';
  if (t.includes('용역')) return '일반용역';
  if (t.includes('민간') || t.includes('위탁')) return '민간';
  return '기타';
}

export async function collectBids(year: number = 2025): Promise<number> {
  const db = getDb();
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  let totalSaved = 0;
  let pageNo = 1;
  let hasMore = true;

  const insertBid = db.prepare(`
    INSERT OR REPLACE INTO bids
      (id, title, agency, dept, work_type, announced_at, deadline_at,
       contract_at, estimated_price, awarded_price, winner, url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  while (hasMore) {
    const { items, totalCount } = await fetchBidList(startDate, endDate, pageNo);
    if (items.length === 0) break;

    const insertMany = db.transaction((rows: G2BItem[]) => {
      for (const item of rows) {
        const workType = detectWorkType(item.bidNtceNm || '');
        if (!WORK_TYPES.includes(workType as typeof WORK_TYPES[number])) continue;

        insertBid.run(
          item.bidNtceNo,
          item.bidNtceNm,
          item.ntceInsttNm,
          item.dminsttNm,
          workType,
          item.bidNtceDt?.slice(0, 10),
          item.bidClseYmd,
          item.cntrctCnclsYmd,
          item.presmptPrce ? parseInt(item.presmptPrce) : null,
          item.drwtPrce ? parseInt(item.drwtPrce) : null,
          item.sucsfbidCorpNm,
          item.ntceSpecFileUrl,
        );
        totalSaved++;
      }
    });

    insertMany(items);

    hasMore = pageNo * 100 < totalCount;
    pageNo++;

    // API 부하 방지
    await new Promise((r) => setTimeout(r, 200));
  }

  return totalSaved;
}

export async function collectPreSpecs(year: number = 2025): Promise<number> {
  const db = getDb();
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  let totalSaved = 0;
  let pageNo = 1;
  let hasMore = true;

  const insertPreSpec = db.prepare(`
    INSERT OR REPLACE INTO pre_specs
      (id, title, agency, dept, work_type, published_at, budget, url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  while (hasMore) {
    const { items, totalCount } = await fetchPreSpecList(startDate, endDate, pageNo);
    if (items.length === 0) break;

    const insertMany = db.transaction((rows: G2BItem[]) => {
      for (const item of rows) {
        const workType = detectWorkType(item.bidNtceNm || '');
        if (!WORK_TYPES.includes(workType as typeof WORK_TYPES[number])) continue;

        insertPreSpec.run(
          item.bidNtceNo,
          item.bidNtceNm,
          item.ntceInsttNm,
          item.dminsttNm,
          workType,
          item.bidNtceDt?.slice(0, 10),
          item.presmptPrce ? parseInt(item.presmptPrce) : null,
          item.ntceSpecFileUrl,
        );
        totalSaved++;
      }
    });

    insertMany(items);

    hasMore = pageNo * 100 < totalCount;
    pageNo++;

    await new Promise((r) => setTimeout(r, 200));
  }

  return totalSaved;
}
