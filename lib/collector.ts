/**
 * 공공데이터포털 나라장터 API 수집기
 *
 * API 엔드포인트:
 * - 입찰공고: https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoServc
 * - 사전규격공고: https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getPreSpcPublicListInfoServc
 */

import { getDb, WORK_TYPES } from './db';

const BASE_URL = 'https://apis.data.go.kr/1230000/ad/BidPublicInfoService';
const API_KEY = process.env.PUBLIC_DATA_API_KEY;

// 나라장터 업무구분 → 내부 코드 매핑
// bsnsDivNm 필드값 기준
const BSNS_DIV_MAP: Record<string, string> = {
  '용역': '일반용역',
  '일반용역': '일반용역',
  '기술용역': '기술용역',
  '민간': '민간',
  '기타': '기타',
};

interface G2BItem {
  bidNtceNo?: string;           // 입찰공고번호
  bidNtceOrd?: string;          // 입찰공고차수
  bidNtceNm?: string;           // 입찰공고명
  ntceInsttNm?: string;         // 공고기관명
  dminsttNm?: string;           // 수요기관명
  bsnsDivNm?: string;           // 업무구분명
  bidNtceDt?: string;           // 입찰공고일시
  bidClseDt?: string;           // 입찰마감일시
  opengDt?: string;             // 개찰일시
  presmptPrce?: string;         // 추정가격
  drwtPrce?: string;            // 낙찰금액
  sucsfbidCorpNm?: string;      // 낙찰업체명
  ntceSpecFileUrl1?: string;    // 공고문서URL
  bidClseYmd?: string;          // 입찰마감일자
  cntrctCnclsYmd?: string;      // 계약체결일자
  wghtdAvgPrce?: string;        // 가중평균가격
  // 사전규격 전용
  presnatnOprtnDt?: string;     // 사전규격등록일시
  presnatnClseDt?: string;      // 의견등록마감일시
  dtilBdgtAmt?: string;         // 배정예산액
}

/** 응답에서 items 배열 추출 (단일 item도 배열로 반환) */
function extractItems(body: unknown): G2BItem[] {
  if (!body || typeof body !== 'object') return [];
  const b = body as Record<string, unknown>;
  const rawItems = (b.items as Record<string, unknown>)?.item;
  if (!rawItems) return [];
  return Array.isArray(rawItems) ? rawItems as G2BItem[] : [rawItems as G2BItem];
}

/** 제목으로 업무구분 추론 (API 필드가 없을 때 fallback) */
function detectWorkType(title: string): string {
  const t = title;
  if (t.includes('기술') || t.includes('컨설팅') || t.includes('연구') || t.includes('개발')) return '기술용역';
  if (t.includes('용역')) return '일반용역';
  if (t.includes('민간') || t.includes('위탁')) return '민간';
  return '기타';
}

/** bsnsDivNm → 내부 workType */
function mapWorkType(item: G2BItem): string {
  if (item.bsnsDivNm) {
    const mapped = BSNS_DIV_MAP[item.bsnsDivNm.trim()];
    if (mapped) return mapped;
  }
  return detectWorkType(item.bidNtceNm || '');
}

/** 입찰공고 목록 조회 */
async function fetchBidList(
  startDate: string,
  endDate: string,
  pageNo: number = 1
): Promise<{ items: G2BItem[]; totalCount: number }> {
  if (!API_KEY) return { items: [], totalCount: 0 };

  const params = new URLSearchParams({
    serviceKey: API_KEY,
    numOfRows: '100',
    pageNo: String(pageNo),
    type: 'json',
    inqryDiv: '1',        // 1=공고일 기준
    inqryBgnDt: startDate.replace(/-/g, '') + '0000',
    inqryEndDt: endDate.replace(/-/g, '') + '2359',
  });

  const url = `${BASE_URL}/getBidPblancListInfoServc?${params}`;

  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store' });
  } catch (err) {
    console.error('[collector] fetch error:', err);
    return { items: [], totalCount: 0 };
  }

  if (!res.ok) {
    console.error(`[collector] API HTTP 오류: ${res.status} ${res.statusText}`);
    return { items: [], totalCount: 0 };
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    const text = await res.text().catch(() => '');
    console.error('[collector] JSON 파싱 오류, 응답:', text.slice(0, 500));
    return { items: [], totalCount: 0 };
  }

  const body = (data as Record<string, unknown>)?.response as Record<string, unknown> | undefined;
  const bodyContent = body?.body as Record<string, unknown> | undefined;
  if (!bodyContent) {
    // resultCode 확인
    const resultMsg = (body as Record<string, unknown>)?.header as Record<string, unknown> | undefined;
    console.error('[collector] 응답 body 없음:', JSON.stringify(resultMsg));
    return { items: [], totalCount: 0 };
  }

  const items = extractItems(bodyContent);
  const totalCount = Number(bodyContent.totalCount) || 0;
  console.log(`[collector] 입찰공고 페이지 ${pageNo}: ${items.length}건 / 전체 ${totalCount}건`);
  return { items, totalCount };
}

/** 사전규격공고 목록 조회 */
async function fetchPreSpecList(
  startDate: string,
  endDate: string,
  pageNo: number = 1
): Promise<{ items: G2BItem[]; totalCount: number }> {
  if (!API_KEY) return { items: [], totalCount: 0 };

  const params = new URLSearchParams({
    serviceKey: API_KEY,
    numOfRows: '100',
    pageNo: String(pageNo),
    type: 'json',
    inqryBgnDt: startDate.replace(/-/g, '') + '0000',
    inqryEndDt: endDate.replace(/-/g, '') + '2359',
  });

  const url = `${BASE_URL}/getPreSpcPublicListInfoServc?${params}`;

  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store' });
  } catch (err) {
    console.error('[collector] 사전규격 fetch error:', err);
    return { items: [], totalCount: 0 };
  }

  if (!res.ok) {
    console.error(`[collector] 사전규격 API 오류: ${res.status}`);
    return { items: [], totalCount: 0 };
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return { items: [], totalCount: 0 };
  }

  const body = (data as Record<string, unknown>)?.response as Record<string, unknown> | undefined;
  const bodyContent = body?.body as Record<string, unknown> | undefined;
  if (!bodyContent) return { items: [], totalCount: 0 };

  const items = extractItems(bodyContent);
  const totalCount = Number(bodyContent.totalCount) || 0;
  console.log(`[collector] 사전규격 페이지 ${pageNo}: ${items.length}건 / 전체 ${totalCount}건`);
  return { items, totalCount };
}

/** 입찰공고 수집 및 저장 */
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
        const workType = mapWorkType(item);
        if (!WORK_TYPES.includes(workType as typeof WORK_TYPES[number])) continue;

        // 공고번호 + 차수로 ID 생성
        const id = item.bidNtceOrd
          ? `${item.bidNtceNo}-${item.bidNtceOrd}`
          : item.bidNtceNo || '';

        // 날짜: YYYYMMDDHHII → YYYY-MM-DD
        const announcedAt = item.bidNtceDt
          ? item.bidNtceDt.slice(0, 4) + '-' + item.bidNtceDt.slice(4, 6) + '-' + item.bidNtceDt.slice(6, 8)
          : null;

        const deadlineAt = item.bidClseYmd || null;
        const contractAt = item.cntrctCnclsYmd || null;

        insertBid.run(
          id,
          item.bidNtceNm,
          item.ntceInsttNm,
          item.dminsttNm,
          workType,
          announcedAt,
          deadlineAt,
          contractAt,
          item.presmptPrce ? parseInt(item.presmptPrce) : null,
          item.drwtPrce ? parseInt(item.drwtPrce) : null,
          item.sucsfbidCorpNm || null,
          item.ntceSpecFileUrl1 || null,
        );
        totalSaved++;
      }
    });

    insertMany(items);

    hasMore = pageNo * 100 < totalCount;
    pageNo++;

    // API 부하 방지 (200ms 간격)
    if (hasMore) await new Promise((r) => setTimeout(r, 200));
  }

  return totalSaved;
}

/** 사전규격공고 수집 및 저장 */
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
        const workType = mapWorkType(item);
        if (!WORK_TYPES.includes(workType as typeof WORK_TYPES[number])) continue;

        const id = item.bidNtceOrd
          ? `${item.bidNtceNo}-${item.bidNtceOrd}`
          : item.bidNtceNo || '';

        // 사전규격은 presnatnOprtnDt 사용
        const publishedAt = item.presnatnOprtnDt
          ? item.presnatnOprtnDt.slice(0, 4) + '-' + item.presnatnOprtnDt.slice(4, 6) + '-' + item.presnatnOprtnDt.slice(6, 8)
          : item.bidNtceDt
          ? item.bidNtceDt.slice(0, 4) + '-' + item.bidNtceDt.slice(4, 6) + '-' + item.bidNtceDt.slice(6, 8)
          : null;

        const budget = item.dtilBdgtAmt
          ? parseInt(item.dtilBdgtAmt)
          : item.presmptPrce
          ? parseInt(item.presmptPrce)
          : null;

        insertPreSpec.run(
          id,
          item.bidNtceNm,
          item.ntceInsttNm,
          item.dminsttNm,
          workType,
          publishedAt,
          budget,
          item.ntceSpecFileUrl1 || null,
        );
        totalSaved++;
      }
    });

    insertMany(items);

    hasMore = pageNo * 100 < totalCount;
    pageNo++;

    if (hasMore) await new Promise((r) => setTimeout(r, 200));
  }

  return totalSaved;
}
