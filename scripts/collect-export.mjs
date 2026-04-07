/**
 * 나라장터 G2B 입찰공고 수집 → 엑셀 출력 스크립트
 *
 * 사용법:
 *   node scripts/collect-export.mjs [연도]
 *   node scripts/collect-export.mjs 2025
 *   node scripts/collect-export.mjs 2023 2024 2025
 *
 * 출력: output/나라장터_입찰공고_2025.xlsx
 */

import { writeFileSync, mkdirSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

// ── 설정 ──────────────────────────────────────────────────────────────────────
const API_KEY = process.env.PUBLIC_DATA_API_KEY
  || 'MA2vFmc4GRZYQDZtoUe6XyW80tkLDS7bhG4xxKovfuUvTgYML+RgFBvQLD6l/O21jp+YB5Sp+GrEBBZVZec3Cw==';

const BASE_URL = 'https://apis.data.go.kr/1230000/ad/BidPublicInfoService';
const ROWS_PER_PAGE = 100;
const DELAY_MS = 300; // API 호출 간격

// 대상 업무구분 (용역 계열만 수집)
const TARGET_WORK_TYPES = ['일반용역', '기술용역', '민간', '기타'];

// 나라장터 bsnsDivNm → 내부 분류
const BSNS_DIV_MAP = {
  '용역': '일반용역',
  '일반용역': '일반용역',
  '기술용역': '기술용역',
  '민간': '민간',
  '기타': '기타',
  '일반용역(기술)': '기술용역',
};

// ── 유틸 ──────────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function detectWorkType(title = '') {
  if (title.includes('기술') || title.includes('컨설팅') || title.includes('연구') || title.includes('개발')) return '기술용역';
  if (title.includes('용역')) return '일반용역';
  if (title.includes('민간') || title.includes('위탁')) return '민간';
  return '기타';
}

function mapWorkType(item) {
  if (item.bsnsDivNm) {
    const mapped = BSNS_DIV_MAP[item.bsnsDivNm.trim()];
    if (mapped) return mapped;
  }
  return detectWorkType(item.bidNtceNm || '');
}

function fmtDate(raw) {
  // YYYYMMDDHHII 또는 YYYYMMDD → YYYY-MM-DD
  if (!raw) return '';
  const s = String(raw).replace(/\D/g, '');
  if (s.length >= 8) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
  return raw;
}

function fmtMoney(raw) {
  if (!raw) return '';
  const n = parseInt(raw);
  return isNaN(n) ? '' : n;
}

function extractItems(body) {
  const raw = body?.items?.item;
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

// ── API 호출 ──────────────────────────────────────────────────────────────────
async function fetchPage(operation, extraParams, pageNo) {
  const params = new URLSearchParams({
    serviceKey: API_KEY,
    numOfRows: String(ROWS_PER_PAGE),
    pageNo: String(pageNo),
    type: 'json',
    ...extraParams,
  });

  const url = `${BASE_URL}/${operation}?${params}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);

  const data = await res.json();

  // 오류 응답 체크
  const header = data?.response?.header;
  if (header && header.resultCode !== '00' && header.resultCode !== '000') {
    throw new Error(`API 오류 [${header.resultCode}]: ${header.resultMsg}`);
  }

  const body = data?.response?.body;
  if (!body) throw new Error('응답 body 없음');

  return {
    items: extractItems(body),
    totalCount: Number(body.totalCount) || 0,
  };
}

async function fetchAll(operation, extraParams, label) {
  const allItems = [];
  let pageNo = 1;

  process.stdout.write(`  ${label} 수집 중`);

  while (true) {
    const { items, totalCount } = await fetchPage(operation, extraParams, pageNo);

    allItems.push(...items);
    process.stdout.write(` .${allItems.length}`);

    if (items.length === 0 || allItems.length >= totalCount) break;
    pageNo++;
    await sleep(DELAY_MS);
  }

  console.log(` → ${allItems.length}건`);
  return allItems;
}

// ── 연도별 수집 ───────────────────────────────────────────────────────────────
async function collectYear(year) {
  const startDt = `${year}01010000`;
  const endDt   = `${year}12312359`;

  console.log(`\n[${year}년] 수집 시작`);

  // 1. 입찰공고
  const bidItems = await fetchAll(
    'getBidPblancListInfoServc',
    { inqryDiv: '1', inqryBgnDt: startDt, inqryEndDt: endDt },
    '입찰공고'
  );

  // 2. 사전규격공고
  let preItems = [];
  try {
    preItems = await fetchAll(
      'getPreSpcPublicListInfoServc',
      { inqryBgnDt: startDt, inqryEndDt: endDt },
      '사전규격'
    );
  } catch (e) {
    console.warn(`  사전규격 수집 실패 (건너뜀): ${e.message}`);
  }

  return { year, bidItems, preItems };
}

// ── 엑셀 행 변환 ──────────────────────────────────────────────────────────────
function bidToRow(item, year) {
  const workType = mapWorkType(item);
  if (!TARGET_WORK_TYPES.includes(workType)) return null;

  return {
    '연도':         year,
    '업무구분':     workType,
    '입찰공고번호': item.bidNtceNo || '',
    '차수':         item.bidNtceOrd || '1',
    '공고명':       item.bidNtceNm || '',
    '공고기관':     item.ntceInsttNm || '',
    '수요기관':     item.dminsttNm || '',
    '공고일':       fmtDate(item.bidNtceDt),
    '마감일':       fmtDate(item.bidClseYmd || item.bidClseDt),
    '계약체결일':   fmtDate(item.cntrctCnclsYmd),
    '추정가격(원)': fmtMoney(item.presmptPrce),
    '낙찰금액(원)': fmtMoney(item.drwtPrce),
    '낙찰율(%)':    item.presmptPrce && item.drwtPrce
                      ? Math.round(parseInt(item.drwtPrce) / parseInt(item.presmptPrce) * 1000) / 10
                      : '',
    '낙찰업체':     item.sucsfbidCorpNm || '',
    '공고URL':      item.ntceSpecFileUrl1 || '',
  };
}

function preToRow(item, year) {
  const workType = mapWorkType(item);
  if (!TARGET_WORK_TYPES.includes(workType)) return null;

  return {
    '연도':         year,
    '업무구분':     workType,
    '사전규격번호': item.bidNtceNo || '',
    '공고명':       item.bidNtceNm || '',
    '공고기관':     item.ntceInsttNm || '',
    '수요기관':     item.dminsttNm || '',
    '등록일':       fmtDate(item.presnatnOprtnDt || item.bidNtceDt),
    '의견마감일':   fmtDate(item.presnatnClseDt),
    '예산액(원)':   fmtMoney(item.dtilBdgtAmt || item.presmptPrce),
    '공고URL':      item.ntceSpecFileUrl1 || '',
  };
}

// ── 연속사업 탐지 ─────────────────────────────────────────────────────────────
function normalizeTitle(title) {
  return title
    .replace(/20\d{2}년도?/g, '')
    .replace(/\d{4}년도?/g, '')
    .replace(/\d+차\s*/g, '')
    .replace(/제\s*\d+\s*회/g, '')
    .replace(/\(\d{4}\)/g, '')
    .replace(/\[\d{4}\]/g, '')
    .replace(/연간\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectRecurring(allBidRows) {
  // agency + normalizedTitle 기준 그룹핑
  const groups = {};
  for (const row of allBidRows) {
    const norm = normalizeTitle(row['공고명']);
    const key = `${row['공고기관']}||${norm}`;
    if (!groups[key]) groups[key] = { norm, agency: row['공고기관'], rows: [] };
    groups[key].rows.push(row);
  }

  const recurring = [];
  for (const [, g] of Object.entries(groups)) {
    const years = [...new Set(g.rows.map((r) => r['연도']))].sort();
    if (years.length < 2) continue;

    const winners = [...new Set(g.rows.map((r) => r['낙찰업체']).filter(Boolean))];
    const prices = g.rows.map((r) => r['추정가격(원)']).filter((p) => p);
    const avgPrice = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : '';

    recurring.push({
      '공고기관':       g.agency,
      '사업명(정규화)': g.norm,
      '연속연도':       years.join(', '),
      '출현횟수':       years.length,
      '연속여부':       years.length >= 2 ? `${years.length}년 연속` : '-',
      '예상계약기간':   years.length >= 3 ? '6년 이상 장기계약 추정' : years.length === 2 ? '4년 장기계약 추정' : '-',
      '평균추정가(원)': avgPrice,
      '낙찰업체목록':   winners.join(' / '),
      '동일업체수주':   winners.length === 1 ? '동일' : `${winners.length}개사`,
      '주목사항':       winners.length === 1 && years.length >= 2 ? '⚠️ 동일업체 반복수주' : '',
    });
  }

  return recurring.sort((a, b) => b['출현횟수'] - a['출현횟수']);
}

// ── 메인 ──────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const years = args.length > 0
    ? args.map(Number).filter((y) => y >= 2020 && y <= 2030)
    : [2025];

  console.log('='.repeat(60));
  console.log('나라장터 G2B 입찰공고 수집기');
  console.log(`대상 연도: ${years.join(', ')}년`);
  console.log(`대상 업무: ${TARGET_WORK_TYPES.join(', ')}`);
  console.log('='.repeat(60));

  const allBidRows = [];
  const allPreRows = [];

  for (const year of years) {
    const { bidItems, preItems } = await collectYear(year);

    for (const item of bidItems) {
      const row = bidToRow(item, year);
      if (row) allBidRows.push(row);
    }
    for (const item of preItems) {
      const row = preToRow(item, year);
      if (row) allPreRows.push(row);
    }
  }

  const recurringRows = detectRecurring(allBidRows);

  console.log('\n' + '='.repeat(60));
  console.log(`수집 결과:`);
  console.log(`  입찰공고 (필터 후): ${allBidRows.length}건`);
  console.log(`  사전규격 (필터 후): ${allPreRows.length}건`);
  console.log(`  연속사업 탐지: ${recurringRows.length}건`);
  console.log('='.repeat(60));

  // ── 엑셀 생성 ──
  const wb = XLSX.utils.book_new();

  // 시트 1: 입찰공고
  if (allBidRows.length > 0) {
    const ws1 = XLSX.utils.json_to_sheet(allBidRows);
    // 컬럼 너비 설정
    ws1['!cols'] = [
      {wch:6},{wch:10},{wch:18},{wch:4},{wch:50},{wch:20},{wch:20},
      {wch:12},{wch:12},{wch:12},{wch:14},{wch:14},{wch:10},{wch:20},{wch:40}
    ];
    XLSX.utils.book_append_sheet(wb, ws1, '입찰공고');
  }

  // 시트 2: 사전규격
  if (allPreRows.length > 0) {
    const ws2 = XLSX.utils.json_to_sheet(allPreRows);
    ws2['!cols'] = [
      {wch:6},{wch:10},{wch:18},{wch:50},{wch:20},{wch:20},
      {wch:12},{wch:12},{wch:14},{wch:40}
    ];
    XLSX.utils.book_append_sheet(wb, ws2, '사전규격공고');
  }

  // 시트 3: 연속사업 분석
  if (recurringRows.length > 0) {
    const ws3 = XLSX.utils.json_to_sheet(recurringRows);
    ws3['!cols'] = [
      {wch:20},{wch:50},{wch:20},{wch:8},{wch:12},{wch:22},{wch:16},{wch:30},{wch:10},{wch:20}
    ];
    XLSX.utils.book_append_sheet(wb, ws3, '연속사업분석');
  }

  // 시트 4: 요약
  const summaryRows = years.map((y) => ({
    '연도': y,
    '입찰공고(전체)': allBidRows.filter((r) => r['연도'] === y).length,
    '일반용역': allBidRows.filter((r) => r['연도'] === y && r['업무구분'] === '일반용역').length,
    '기술용역': allBidRows.filter((r) => r['연도'] === y && r['업무구분'] === '기술용역').length,
    '민간': allBidRows.filter((r) => r['연도'] === y && r['업무구분'] === '민간').length,
    '기타': allBidRows.filter((r) => r['연도'] === y && r['업무구분'] === '기타').length,
    '사전규격': allPreRows.filter((r) => r['연도'] === y).length,
    '연속사업': recurringRows.filter((r) => r['연속연도'].includes(String(y))).length,
  }));
  const ws4 = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, ws4, '연도별요약');

  // 파일 저장
  mkdirSync('output', { recursive: true });
  const filename = `output/나라장터_입찰공고_${years.join('-')}.xlsx`;
  XLSX.writeFile(wb, filename);

  console.log(`\n✅ 저장 완료: ${filename}`);
  console.log(`   시트: 입찰공고 / 사전규격공고 / 연속사업분석 / 연도별요약`);
}

main().catch((err) => {
  console.error('\n❌ 오류 발생:', err.message);
  process.exit(1);
});
