/**
 * 시드 데이터 스크립트
 * 실행: npm run db:seed
 *
 * API 키 없이 나라장터 입찰 시뮬레이션 데이터를 생성합니다.
 * 실제 데이터 수집은 POST /api/collect (API 키 필요)
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'g2b.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// 스키마 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS pre_specs (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, agency TEXT NOT NULL,
    dept TEXT, work_type TEXT NOT NULL, published_at DATE,
    budget INTEGER, url TEXT, bid_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS bids (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, agency TEXT NOT NULL,
    dept TEXT, work_type TEXT NOT NULL, announced_at DATE,
    deadline_at DATE, contract_at DATE, estimated_price INTEGER,
    awarded_price INTEGER, winner TEXT, url TEXT, pre_spec_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sales_memos (
    bid_id TEXT PRIMARY KEY, memo TEXT, status TEXT DEFAULT '관심',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_bids_announced ON bids(announced_at);
  CREATE INDEX IF NOT EXISTS idx_bids_agency ON bids(agency);
  CREATE INDEX IF NOT EXISTS idx_bids_work_type ON bids(work_type);
  CREATE INDEX IF NOT EXISTS idx_pre_specs_published ON pre_specs(published_at);
`);

const existing = (db.prepare('SELECT COUNT(*) as c FROM bids').get() as { c: number }).c;
if (existing > 0) {
  console.log(`이미 ${existing}건의 데이터가 존재합니다. 초기화하려면 data/g2b.db를 삭제 후 재실행하세요.`);
  process.exit(0);
}

const agencies = [
  { name: '국토교통부', dept: '도로정책과' },
  { name: '환경부', dept: '환경정책과' },
  { name: '행정안전부', dept: '정보화담당관' },
  { name: '교육부', dept: '교육정보화과' },
  { name: '보건복지부', dept: '사회서비스정책과' },
  { name: '과학기술정보통신부', dept: 'ICT인프라과' },
  { name: '문화체육관광부', dept: '문화산업과' },
  { name: '산업통상자원부', dept: '산업정책과' },
  { name: '기획재정부', dept: '예산기획과' },
  { name: '서울특별시', dept: '정보화추진단' },
  { name: '경기도', dept: '정보화과' },
  { name: '부산광역시', dept: '정보통신과' },
  { name: '인천광역시', dept: 'ICT정책과' },
  { name: '대구광역시', dept: '정보화담당관' },
  { name: '한국도로공사', dept: '정보화처' },
  { name: '한국수자원공사', dept: 'IT기획처' },
  { name: '한국전력공사', dept: '정보전략처' },
  { name: '한국철도공사', dept: '정보화본부' },
  { name: '한국토지주택공사', dept: 'IT기획처' },
  { name: '국민건강보험공단', dept: '정보화실' },
  { name: '근로복지공단', dept: '정보화추진단' },
  { name: '한국농어촌공사', dept: '정보화처' },
  { name: '국민연금공단', dept: '정보화본부' },
  { name: '한국장애인고용공단', dept: 'IT지원부' },
  { name: '한국산업안전보건공단', dept: '정보화팀' },
];

type WorkType = '일반용역' | '기타' | '민간' | '기술용역';

const projectTemplates: Array<{
  title: string; workType: WorkType; minPrice: number; maxPrice: number;
}> = [
  { title: 'BPR/ISP 수립 용역', workType: '기술용역', minPrice: 200_000_000, maxPrice: 800_000_000 },
  { title: '정보시스템 유지관리 용역', workType: '일반용역', minPrice: 50_000_000, maxPrice: 300_000_000 },
  { title: '데이터 분석 플랫폼 구축', workType: '기술용역', minPrice: 500_000_000, maxPrice: 2_000_000_000 },
  { title: '클라우드 전환 컨설팅', workType: '기술용역', minPrice: 300_000_000, maxPrice: 1_000_000_000 },
  { title: '홈페이지 운영 및 유지관리', workType: '일반용역', minPrice: 30_000_000, maxPrice: 150_000_000 },
  { title: '정보보안 컨설팅 및 취약점 점검', workType: '기술용역', minPrice: 100_000_000, maxPrice: 400_000_000 },
  { title: '빅데이터 플랫폼 구축 사업', workType: '기술용역', minPrice: 800_000_000, maxPrice: 3_000_000_000 },
  { title: '공공 앱 개발 및 운영', workType: '기술용역', minPrice: 200_000_000, maxPrice: 600_000_000 },
  { title: '사무 자동화 시스템 도입', workType: '일반용역', minPrice: 80_000_000, maxPrice: 250_000_000 },
  { title: 'RPA 도입 컨설팅', workType: '기술용역', minPrice: 150_000_000, maxPrice: 500_000_000 },
  { title: '정보화 전략계획 수립', workType: '기술용역', minPrice: 200_000_000, maxPrice: 700_000_000 },
  { title: 'AI·ML 플랫폼 구축', workType: '기술용역', minPrice: 600_000_000, maxPrice: 2_500_000_000 },
  { title: '사이버 보안 관제 서비스', workType: '일반용역', minPrice: 100_000_000, maxPrice: 400_000_000 },
  { title: '공공데이터 개방 시스템 구축', workType: '기술용역', minPrice: 300_000_000, maxPrice: 1_000_000_000 },
  { title: '전산장비 유지보수 용역', workType: '일반용역', minPrice: 50_000_000, maxPrice: 200_000_000 },
  { title: '민간 위탁 복지서비스 운영', workType: '민간', minPrice: 200_000_000, maxPrice: 800_000_000 },
  { title: '민간 투자 타당성 조사', workType: '민간', minPrice: 100_000_000, maxPrice: 400_000_000 },
  { title: '기타 용역 서비스', workType: '기타', minPrice: 30_000_000, maxPrice: 150_000_000 },
  { title: '행사 운영 및 관리 용역', workType: '기타', minPrice: 20_000_000, maxPrice: 100_000_000 },
  { title: '네트워크 인프라 구축', workType: '기술용역', minPrice: 400_000_000, maxPrice: 1_500_000_000 },
  { title: 'ERP 시스템 구축 용역', workType: '기술용역', minPrice: 500_000_000, maxPrice: 2_000_000_000 },
  { title: '재해복구 시스템 구축', workType: '기술용역', minPrice: 300_000_000, maxPrice: 1_200_000_000 },
  { title: '스마트시티 플랫폼 구축', workType: '기술용역', minPrice: 1_000_000_000, maxPrice: 5_000_000_000 },
  { title: '디지털트윈 구축 용역', workType: '기술용역', minPrice: 500_000_000, maxPrice: 2_500_000_000 },
  { title: '챗봇 서비스 구축', workType: '기술용역', minPrice: 100_000_000, maxPrice: 500_000_000 },
];

const winners = [
  'LG CNS', 'SK주식회사 C&C', '삼성SDS', 'KT DS', '롯데정보통신',
  '현대오토에버', '한국지능정보사회진흥원', '한국전자통신연구원',
  'NAVER Cloud', '카카오엔터프라이즈', '쌍용정보통신', '대우정보시스템',
  '한국IBM', '딜로이트 안진', 'KPMG삼정', '아이티센', '더존비즈온',
  '케이사인', '시큐레이어', '비씨카드', '이지스시스템즈', '인포소닉',
];

const insertBid = db.prepare(`
  INSERT OR IGNORE INTO bids
    (id, title, agency, dept, work_type, announced_at, deadline_at,
     contract_at, estimated_price, awarded_price, winner, url, pre_spec_id)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertPreSpec = db.prepare(`
  INSERT OR IGNORE INTO pre_specs
    (id, title, agency, dept, work_type, published_at, budget, url, bid_id)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let totalCount = 0;

const insertAll = db.transaction(() => {
  for (let month = 1; month <= 12; month++) {
    const monthCount = 4 + Math.floor(Math.random() * 7); // 4~10건/월

    for (let i = 0; i < monthCount; i++) {
      const agencyIdx = Math.floor(Math.random() * agencies.length);
      const agency = agencies[agencyIdx];
      const tmpl = projectTemplates[Math.floor(Math.random() * projectTemplates.length)];
      const winner = winners[Math.floor(Math.random() * winners.length)];

      const day = 1 + Math.floor(Math.random() * 25);
      const announcedAt = `2025-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      const preSpecDays = 10 + Math.floor(Math.random() * 21);
      const preDate = new Date(2025, month - 1, day - preSpecDays);
      const publishedAt = `${preDate.getFullYear()}-${String(preDate.getMonth() + 1).padStart(2, '0')}-${String(Math.max(1, preDate.getDate())).padStart(2, '0')}`;

      const deadlineDays = 15 + Math.floor(Math.random() * 16);
      const deadlineDate = new Date(2025, month - 1, day + deadlineDays);
      const deadlineAt = `${deadlineDate.getFullYear()}-${String(deadlineDate.getMonth() + 1).padStart(2, '0')}-${String(deadlineDate.getDate()).padStart(2, '0')}`;

      const contractDays = 30 + Math.floor(Math.random() * 31);
      const contractDate = new Date(deadlineDate);
      contractDate.setDate(contractDate.getDate() + contractDays);
      const contractAt = `${contractDate.getFullYear()}-${String(contractDate.getMonth() + 1).padStart(2, '0')}-${String(contractDate.getDate()).padStart(2, '0')}`;

      const estimatedPrice = tmpl.minPrice + Math.floor(Math.random() * (tmpl.maxPrice - tmpl.minPrice));
      const awardedPrice = Math.floor(estimatedPrice * (0.75 + Math.random() * 0.2));

      const bidId = `BID-2025-${String(month).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}-${agencyIdx}`;
      const preSpecId = `PRE-2025-${String(month).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}-${agencyIdx}`;
      const title = `${agency.name} ${tmpl.title}`;

      insertPreSpec.run(
        preSpecId, title, agency.name, agency.dept, tmpl.workType,
        publishedAt, estimatedPrice,
        `https://www.g2b.go.kr:8101/ep/preparation/prepareOutlineList.do?preSpecNo=${preSpecId}`,
        bidId,
      );

      insertBid.run(
        bidId, title, agency.name, agency.dept, tmpl.workType,
        announcedAt, deadlineAt, contractAt,
        estimatedPrice, awardedPrice, winner,
        `https://www.g2b.go.kr:8101/ep/invitation/publish/bidPublishDetail.do?bidno=${bidId}`,
        preSpecId,
      );

      totalCount++;
    }
  }
});

insertAll();

console.log(`✅ 시드 데이터 삽입 완료: ${totalCount}건`);
console.log(`📁 DB 위치: ${DB_PATH}`);
console.log('');
console.log('다음 단계:');
console.log('  npm run dev  →  http://localhost:3000');
