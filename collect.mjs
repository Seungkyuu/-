/**
 * 나라장터 2025년 일반용역 입찰공고 수집 → 엑셀 저장
 * 실행: node collect.mjs
 */

import { mkdirSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const API_KEY = 'MA2vFmc4GRZYQDZtoUe6XyW80tkLDS7bhG4xxKovfuUvTgYML+RgFBvQLD6l/O21jp+YB5Sp+GrEBBZVZec3Cw==';
const BASE = 'https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoServc';

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

// 날짜 문자열 → YYYY-MM-DD (이미 포맷된 경우도 처리)
function fmt(raw) {
  if (!raw) return '';
  // "2025-01-05 13:34:05" → "2025-01-05"
  if (typeof raw === 'string' && raw.includes('-')) return raw.slice(0, 10);
  // "20250105..." → "2025-01-05"
  const s = String(raw).replace(/\D/g, '');
  return s.length >= 8 ? `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}` : raw;
}

async function fetchPage(bgnDt, endDt, pageNo) {
  const p = new URLSearchParams({
    serviceKey: API_KEY,
    numOfRows: '100',
    pageNo: String(pageNo),
    type: 'json',
    inqryDiv: '1',       // 공고일 기준
    inqryBgnDt: bgnDt,
    inqryEndDt: endDt,
    bsnsDivNm: '용역',   // ← 서버측 업무구분 필터
  });

  const res = await fetch(`${BASE}?${p}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();

  const header = json?.response?.header;
  if (header?.resultCode !== '00') {
    throw new Error(`API 오류 [${header?.resultCode}]: ${header?.resultMsg}`);
  }

  const body = json?.response?.body;
  // body.items 가 직접 배열인 경우와 {item:[]} 구조 모두 처리
  const raw = body?.items;
  let items = [];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (raw?.item) {
    items = Array.isArray(raw.item) ? raw.item : [raw.item];
  }

  return { items, total: Number(body?.totalCount) || 0 };
}

async function fetchMonth(bgnDt, endDt, label) {
  const rows = [];
  let page = 1;

  while (true) {
    const { items, total } = await fetchPage(bgnDt, endDt, page);
    if (!items.length) break;

    for (const it of items) {
      rows.push({
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

    process.stdout.write(`\r  ${label}: ${rows.length}건 / 전체 ${total}건`);
    if (page * 100 >= total) break;
    page++;
    await new Promise(r => setTimeout(r, 300));
  }
  return rows;
}

async function main() {
  console.log('2025년 일반용역(용역) 입찰공고 수집 중...\n');
  const allRows = [];

  for (const [bgn, end, label] of MONTHS) {
    process.stdout.write(`  ${label} 수집 중...`);
    try {
      const rows = await fetchMonth(bgn, end, label);
      allRows.push(...rows);
      console.log(`\r  ${label}: ${rows.length}건 완료 (누적 ${allRows.length}건)`);
    } catch (e) {
      console.log(`\r  ${label}: 오류 - ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 300));
  }

  if (!allRows.length) {
    console.log('\n데이터가 없습니다. API 키 또는 파라미터를 확인하세요.');
    return;
  }

  console.log('\n저장 중...');
  const ws = XLSX.utils.json_to_sheet(allRows);
  ws['!cols'] = [
    {wch:22},{wch:55},{wch:22},{wch:22},{wch:10},{wch:12},
    {wch:12},{wch:12},{wch:12},{wch:12},
    {wch:15},{wch:15},{wch:10},{wch:25},{wch:12},{wch:16},{wch:50}
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '일반용역_2025');
  mkdirSync('output', { recursive: true });
  const file = 'output/일반용역_2025.xlsx';
  XLSX.writeFile(wb, file);
  console.log(`\n✅ 완료: ${file}  (총 ${allRows.length}건)`);
}

main().catch(e => { console.error('\n오류:', e.message); process.exit(1); });
