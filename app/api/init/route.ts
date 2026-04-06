import { NextResponse } from 'next/server';
import { getDb, WORK_TYPES } from '@/lib/db';

// DB 초기화 및 시드 데이터 삽입
export async function POST() {
  try {
    const db = getDb(); // 스키마 자동 생성
    const count = (db.prepare('SELECT COUNT(*) as c FROM bids').get() as { c: number }).c;

    if (count > 0) {
      return NextResponse.json({ message: '이미 데이터가 존재합니다.', count });
    }

    // 시드 데이터 삽입
    const inserted = seedSampleData(db);
    return NextResponse.json({ message: '시드 데이터 삽입 완료', inserted });
  } catch (error) {
    console.error('DB 초기화 오류:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = getDb();
    const bidCount = (db.prepare('SELECT COUNT(*) as c FROM bids').get() as { c: number }).c;
    const preSpecCount = (db.prepare('SELECT COUNT(*) as c FROM pre_specs').get() as { c: number }).c;
    return NextResponse.json({ bidCount, preSpecCount });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

function seedSampleData(db: ReturnType<typeof getDb>): number {
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
    { name: '한국도로공사', dept: '정보화처' },
    { name: '한국수자원공사', dept: 'IT기획처' },
    { name: '한국전력공사', dept: '정보전략처' },
    { name: '한국철도공사', dept: '정보화본부' },
    { name: '한국토지주택공사', dept: 'IT기획처' },
    { name: '국민건강보험공단', dept: '정보화실' },
    { name: '근로복지공단', dept: '정보화추진단' },
    { name: '한국농어촌공사', dept: '정보화처' },
  ];

  const projectTemplates: Array<{ title: string; workType: typeof WORK_TYPES[number]; minPrice: number; maxPrice: number }> = [
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
  ];

  const winners = [
    'LG CNS', 'SK주식회사 C&C', '삼성SDS', 'KT DS', '롯데정보통신',
    '현대오토에버', 'NIA(한국지능정보사회진흥원)', '한국전자통신연구원',
    'NAVER Cloud', '카카오엔터프라이즈', '쌍용정보통신', '대우정보시스템',
    '한국IBM', '딜로이트 안진', 'KPMG삼정', '아이티센', '더존비즈온',
    '케이사인', '시큐레이어', '비씨카드',
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

  let count = 0;

  const insertAll = db.transaction(() => {
    for (let month = 1; month <= 12; month++) {
      // 월별 3~8건 생성
      const monthCount = 3 + Math.floor(Math.random() * 6);

      for (let i = 0; i < monthCount; i++) {
        const agencyIdx = Math.floor(Math.random() * agencies.length);
        const agency = agencies[agencyIdx];
        const tmpl = projectTemplates[Math.floor(Math.random() * projectTemplates.length)];
        const winner = winners[Math.floor(Math.random() * winners.length)];

        // 발주일: 해당 월 내 임의 날짜
        const day = 1 + Math.floor(Math.random() * 25);
        const announcedAt = `2025-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // 사전규격공고: 발주일 10~30일 전
        const preSpecDays = 10 + Math.floor(Math.random() * 20);
        const preDate = new Date(2025, month - 1, day - preSpecDays);
        const publishedAt = `${preDate.getFullYear()}-${String(preDate.getMonth() + 1).padStart(2, '0')}-${String(preDate.getDate()).padStart(2, '0')}`;

        // 마감일: 발주일 + 15~30일
        const deadlineDays = 15 + Math.floor(Math.random() * 15);
        const deadlineDate = new Date(2025, month - 1, day + deadlineDays);
        const deadlineAt = `${deadlineDate.getFullYear()}-${String(deadlineDate.getMonth() + 1).padStart(2, '0')}-${String(deadlineDate.getDate()).padStart(2, '0')}`;

        // 계약일: 마감 + 30~60일
        const contractDays = 30 + Math.floor(Math.random() * 30);
        const contractDate = new Date(deadlineDate);
        contractDate.setDate(contractDate.getDate() + contractDays);
        const contractAt = `${contractDate.getFullYear()}-${String(contractDate.getMonth() + 1).padStart(2, '0')}-${String(contractDate.getDate()).padStart(2, '0')}`;

        const estimatedPrice =
          tmpl.minPrice + Math.floor(Math.random() * (tmpl.maxPrice - tmpl.minPrice));
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

        count++;
      }
    }
  });

  insertAll();
  return count;
}
