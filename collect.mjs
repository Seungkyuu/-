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

async function fetchPage(pageNo) {
  const p = new URLSearchParams({
    serviceKey: API_KEY, numOfRows: '100', pageNo: String(pageNo),
    type: 'json', inqryDiv: '1',
    inqryBgnDt: '202501010000', inqryEndDt: '202512312359',
  });
  const res = await fetch(`${BASE}?${p}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const body = json?.response?.body;
  if (!body) {
    const hdr = json?.response?.header;
    throw new Error(`API 오류: ${hdr?.resultMsg || JSON.stringify(json).slice(0,200)}`);
  }
  const raw = body?.items?.item;
  const items = !raw ? [] : Array.isArray(raw) ? raw : [raw];
  return { items, total: Number(body.totalCount) || 0 };
}

async function main() {
  console.log('2025년 일반용역 입찰공고 수집 중...');
  const rows = [];
  let page = 1;

  while (true) {
    const { items, total } = await fetchPage(page);
    if (!items.length) break;

    for (const it of items) {
      if (!isService(it)) continue;
      rows.push({
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

    process.stdout.write(`\r  ${rows.length}건 수집 / 전체 ${total}건 (페이지 ${page})`);
    if (page * 100 >= total) break;
    page++;
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
