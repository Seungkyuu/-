/**
 * 나라장터 2025년 일반용역 입찰공고 수집 → 엑셀 저장
 * 실행: node collect.mjs
 */

import { mkdirSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const API_KEY = 'MA2vFmc4GRZYQDZtoUe6XyW80tkLDS7bhG4xxKovfuUvTgYML+RgFBvQLD6l/O21jp+YB5Sp+GrEBBZVZec3Cw==';
const BASE = 'https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoServc';

// G2B API는 한 번에 최대 1개월 조회 가능 → 월별로 분할
const MONTHS = [
  ['202501010000','202501312359'],
  ['202502010000','202502282359'],
  ['202503010000','202503312359'],
  ['202504010000','202504302359'],
  ['202505010000','202505312359'],
  ['202506010000','202506302359'],
  ['202507010000','202507312359'],
  ['202508010000','202508312359'],
  ['202509010000','202509302359'],
  ['202510010000','202510312359'],
  ['202511010000','202511302359'],
  ['202512010000','202512312359'],
];

function isService(item) {
  const div = (item.bsnsDivNm || '').trim();
  const nm  = item.bidNtceNm || '';
  if (div === '용역' || div === '일반용역') return true;
  if (div === '') {
    return nm.includes('용역') && !nm.includes('기술') && !nm.includes('연구') && !nm.includes('개발');
  }
  return false;
}

function fmt(raw) {
  if (!raw) return '';
  const s = String(raw).replace(/\D/g, '');
  return s.length >= 8 ? `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}` : raw;
}

let _debugDone = false;

async function fetchPage(bgnDt, endDt, pageNo) {
  const p = new URLSearchParams({
    serviceKey: API_KEY, numOfRows: '100', pageNo: String(pageNo),
    type: 'json', inqryDiv: '1',
    inqryBgnDt: bgnDt, inqryEndDt: endDt,
  });
  const res = await fetch(`${BASE}?${p}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();

  // 최초 1회 원시 응답 구조 출력
  if (!_debugDone) {
    _debugDone = true;
    console.log('\n[DEBUG 원시응답 구조]');
    console.log(JSON.stringify(json, null, 2).slice(0, 2000));
    console.log('[DEBUG 끝]\n');
  }

  const body = json?.response?.body;
  if (!body) {
    const hdr = json?.response?.header;
    throw new Error(`API 오류: ${JSON.stringify(hdr)}`);
  }
  const raw = body?.items?.item;
  const items = !raw ? [] : Array.isArray(raw) ? raw : [raw];
  return { items, total: Number(body.totalCount) || 0 };
}

async function fetchMonth(bgnDt, endDt, label) {
  const monthRows = [];
  let page = 1;
  while (true) {
    const { items, total } = await fetchPage(bgnDt, endDt, page);
    if (!items.length) break;

    // 첫 페이지 첫 번째 아이템의 bsnsDivNm 값 확인 (디버그)
    if (page === 1 && label === '1월' && items.length > 0) {
      const sample = items.slice(0, 3).map(i => ({ nm: i.bidNtceNm?.slice(0,20), div: i.bsnsDivNm }));
      console.log('\n  [샘플]', JSON.stringify(sample));
      // bsnsDivNm 고유값 출력
      const divSet = [...new Set(items.map(i => i.bsnsDivNm || '(없음)'))];
      console.log('  [업무구분값]', divSet.join(', '));
    }

    for (const it of items) {
      if (!isService(it)) continue;
      monthRows.push({
        '입찰공고번호': `${it.bidNtceNo || ''}-${it.bidNtceOrd || '1'}`,
        '공고명':       it.bidNtceNm || '',
        '공고기관':     it.ntceInsttNm || '',
        '수요기관':     it.dminsttNm || '',
        '공고일':       fmt(it.bidNtceDt),
        '마감일':       fmt(it.bidClseYmd || it.bidClseDt),
        '계약체결일':   fmt(it.cntrctCnclsYmd),
        '추정가격(원)': it.presmptPrce ? parseInt(it.presmptPrce) : '',
        '낙찰금액(원)': it.drwtPrce    ? parseInt(it.drwtPrce)    : '',
        '낙찰율(%)':    (it.presmptPrce && it.drwtPrce)
                          ? Math.round(parseInt(it.drwtPrce) / parseInt(it.presmptPrce) * 1000) / 10
                          : '',
        '낙찰업체':     it.sucsfbidCorpNm || '',
        '공고URL':      it.ntceSpecFileUrl1 || '',
      });
    }
    if (page * 100 >= total) break;
    page++;
    await new Promise(r => setTimeout(r, 300));
  }
  return monthRows;
}

async function main() {
  console.log('2025년 일반용역 입찰공고 수집 중... (월별 12회 조회)');
  const rows = [];

  for (let i = 0; i < MONTHS.length; i++) {
    const [bgn, end] = MONTHS[i];
    const label = `${i+1}월`;
    process.stdout.write(`  ${label} 수집 중...`);
    const monthRows = await fetchMonth(bgn, end, label);
    rows.push(...monthRows);
    console.log(` ${monthRows.length}건 (누적 ${rows.length}건)`);
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('\n저장 중...');
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{wch:20},{wch:55},{wch:22},{wch:22},{wch:12},{wch:12},{wch:12},{wch:15},{wch:15},{wch:10},{wch:22},{wch:45}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '일반용역_2025');
  mkdirSync('output', { recursive: true });
  const file = 'output/일반용역_2025.xlsx';
  XLSX.writeFile(wb, file);
  console.log(`✅ 완료: ${file}  (${rows.length}건)`);
}

main().catch(e => { console.error('오류:', e.message); process.exit(1); });
