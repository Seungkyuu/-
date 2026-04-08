/**
 * 나라장터 2025년 교육 관련 입찰공고 수집 → 엑셀 저장
 * 실행: node collect.mjs
 */

import { mkdirSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const API_KEY = 'MA2vFmc4GRZYQDZtoUe6XyW80tkLDS7bhG4xxKovfuUvTgYML+RgFBvQLD6l/O21jp+YB5Sp+GrEBBZVZec3Cw==';
const BASE = 'https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoServc';

// ── 교육회사 대상 키워드 20개 ──────────────────────────────────────────────────
const EDU_KEYWORDS = [
  '이러닝',
  'e-러닝',
  '사이버연수',
  '사이버교육',
  '북러닝',
  '독서통신',
  '원격교육',
  '원격훈련',
  '역량강화교육',
  '역량강화 교육',
  '직무교육',
  '직무연수',
  '직원교육',
  '직원연수',
  '교육훈련',
  '리더십교육',
  '법정의무교육',
  '온라인교육',
  '교육콘텐츠',
  'HRD',
];

// 사업명에 키워드 포함 여부 확인
function matchesKeyword(title) {
  const t = (title || '').toLowerCase();
  return EDU_KEYWORDS.some(kw => t.includes(kw.toLowerCase()));
}

// G2B API 최대 1개월 범위 제한 → 월별 분할
const MONTHS = [
  ['202501010000','202501312359','1월'],
  ['202502010000','202502282359','2월'],
  ['202503010000','202503312359','3월'],
  ['202504010000','202504302359','4월'],
  ['202505010000','202505312359','5월'],
  ['202506010000','202506302359','6월'],
  ['202507010000','202507312359','7월'],
  ['202508010000','202508312359','8월'],
  ['202509010000','202509302359','9월'],
  ['202510010000','202510312359','10월'],
  ['202511010000','202511302359','11월'],
  ['202512010000','202512312359','12월'],
];

// 날짜 문자열 → YYYY-MM-DD
function fmt(raw) {
  if (!raw) return '';
  if (typeof raw === 'string' && raw.includes('-')) return raw.slice(0, 10);
  const s = String(raw).replace(/\D/g, '');
  return s.length >= 8 ? `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}` : raw;
}

// 일치한 키워드 반환 (어떤 키워드로 매칭됐는지 엑셀에 표시)
function matchedKeyword(title) {
  const t = (title || '').toLowerCase();
  return EDU_KEYWORDS.filter(kw => t.includes(kw.toLowerCase())).join(', ');
}

async function fetchPage(bgnDt, endDt, pageNo) {
  const p = new URLSearchParams({
    serviceKey: API_KEY,
    numOfRows: '100',
    pageNo: String(pageNo),
    type: 'json',
    inqryDiv: '1',
    inqryBgnDt: bgnDt,
    inqryEndDt: endDt,
    bsnsDivNm: '용역',   // 서버측 1차 필터: 용역 계열만 요청
  });

  const res = await fetch(`${BASE}?${p}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();

  const header = json?.response?.header;
  if (header?.resultCode !== '00') {
    throw new Error(`API 오류 [${header?.resultCode}]: ${header?.resultMsg}`);
  }

  const body = json?.response?.body;
  const raw = body?.items;
  let items = [];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (raw?.item) {
    items = Array.isArray(raw.item) ? raw.item : [raw.item];
  }

  // 클라이언트측 2차 필터: 응답에 bsnsDivNm 있으면 일반용역/용역만 통과
  // (서버 필터가 무시되더라도 여기서 한 번 더 걸러냄)
  items = items.filter(it => {
    const div = (it.bsnsDivNm || '').trim();
    return div === '' || div.includes('용역');
  });

  return { items, total: Number(body?.totalCount) || 0 };
}

async function fetchMonth(bgnDt, endDt, label) {
  const rows = [];
  let page = 1;
  let totalFetched = 0;

  while (true) {
    const { items, total } = await fetchPage(bgnDt, endDt, page);
    if (!items.length) break;

    totalFetched += items.length;

    for (const it of items) {
      if (!matchesKeyword(it.bidNtceNm)) continue;  // 키워드 필터
      rows.push({
        '매칭키워드':   matchedKeyword(it.bidNtceNm),
        '입찰공고번호': `${it.bidNtceNo || ''}-${it.bidNtceOrd || '000'}`,
        '공고명':       it.bidNtceNm || '',
        '공고기관':     it.ntceInsttNm || '',
        '수요기관':     it.dminsttNm || '',
        '입찰방법':     it.bidMethdNm || '',
        '계약방법':     it.cntrctCnclsMthdNm || '',
        '공고일':       fmt(it.bidNtceDt),
        '입찰시작일':   fmt(it.bidBeginDt),
        '마감일':       fmt(it.bidClseDt),
        '개찰일':       fmt(it.opengDt),
        '추정가격(원)': it.presmptPrce ? parseInt(it.presmptPrce) : '',
        '낙찰금액(원)': it.drwtPrce    ? parseInt(it.drwtPrce)    : '',
        '낙찰율(%)':    (it.presmptPrce && it.drwtPrce)
                          ? Math.round(parseInt(it.drwtPrce) / parseInt(it.presmptPrce) * 1000) / 10
                          : '',
        '낙찰업체':     it.sucsfbidCorpNm || '',
        '담당자':       it.ntceInsttOfclNm || '',
        '담당자연락처': it.ntceInsttOfclTelNo || '',
        '공고URL':      it.ntceSpecDocUrl1 || '',
      });
    }

    process.stdout.write(`\r  ${label}: ${totalFetched}/${total}건 조회 → 매칭 ${rows.length}건`);
    if (totalFetched >= total) break;
    page++;
    await new Promise(r => setTimeout(r, 300));
  }
  return rows;
}

async function main() {
  console.log('2025년 교육 관련 입찰공고 수집 중...');
  console.log(`키워드 ${EDU_KEYWORDS.length}개: ${EDU_KEYWORDS.join(', ')}\n`);
  const allRows = [];

  for (const [bgn, end, label] of MONTHS) {
    process.stdout.write(`  ${label} 수집 중...`);
    try {
      const rows = await fetchMonth(bgn, end, label);
      allRows.push(...rows);
      console.log(`\r  ${label} 완료: 매칭 ${rows.length}건 (누적 ${allRows.length}건)           `);
    } catch (e) {
      console.log(`\r  ${label} 오류: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 300));
  }

  if (!allRows.length) {
    console.log('\n매칭된 데이터가 없습니다.');
    return;
  }

  console.log('\n저장 중...');
  const ws = XLSX.utils.json_to_sheet(allRows);
  ws['!cols'] = [
    {wch:20},{wch:22},{wch:55},{wch:22},{wch:22},
    {wch:10},{wch:12},{wch:12},{wch:12},{wch:12},{wch:12},
    {wch:15},{wch:15},{wch:10},{wch:25},{wch:12},{wch:16},{wch:50}
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '교육관련_2025');
  mkdirSync('output', { recursive: true });
  const file = 'output/교육관련_입찰공고_2025.xlsx';
  XLSX.writeFile(wb, file);
  console.log(`\n✅ 완료: ${file}  (총 ${allRows.length}건)`);
  console.log('\n키워드별 건수:');
  for (const kw of EDU_KEYWORDS) {
    const cnt = allRows.filter(r => r['매칭키워드'].includes(kw)).length;
    if (cnt > 0) console.log(`  ${kw}: ${cnt}건`);
  }
}

main().catch(e => { console.error('\n오류:', e.message); process.exit(1); });
