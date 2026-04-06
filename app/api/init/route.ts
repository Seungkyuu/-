import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { validateDatabase } from '@/lib/validation';

export async function POST() {
  try {
    const db = getDb();
    const count = (db.prepare('SELECT COUNT(*) as c FROM bids').get() as { c: number }).c;

    if (count > 0) {
      const validations = [2023, 2024, 2025].map((y) => validateDatabase(db, y));
      return NextResponse.json({
        message: `이미 데이터가 존재합니다 (총 ${count}건). 재초기화하려면 data/g2b.db를 삭제 후 재시도하세요.`,
        count,
        validations,
      });
    }

    const inserted = seedMultiYearData(db);

    // 수집 후 검증
    const validations = [2023, 2024, 2025].map((y) => validateDatabase(db, y));
    const allPassed = validations.every((v) => v.summary !== 'fail');

    return NextResponse.json({
      message: `3개년 샘플 데이터 삽입 완료 (2023~2025년)`,
      inserted,
      validations,
      validationSummary: allPassed ? 'pass' : 'fail',
    });
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

    const yearBreakdown = db.prepare(`
      SELECT strftime('%Y', announced_at) as year, COUNT(*) as count
      FROM bids GROUP BY year ORDER BY year
    `).all() as Array<{ year: string; count: number }>;

    return NextResponse.json({ bidCount, preSpecCount, yearBreakdown });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════
// 3개년 시드 데이터 생성 (2023 ~ 2025)
// ═══════════════════════════════════════════════════════

type WorkType = '일반용역' | '기타' | '민간' | '기술용역';

interface RecurringBase {
  agency: string;
  dept: string;
  baseTitle: string;
  workType: WorkType;
  basePrice: number;
  month: number;          // 주 발주 월
  recurringYears: number[]; // 출현 연도
  baseWinner: string;     // 주 낙찰업체
}

// 연속사업 (2~3년 반복 출현)
const RECURRING_PROJECTS: RecurringBase[] = [
  { agency: '국토교통부', dept: '도로정책과', baseTitle: '도로 유지관리 정보시스템 운영', workType: '일반용역', basePrice: 150_000_000, month: 2, recurringYears: [2023, 2024, 2025], baseWinner: '쌍용정보통신' },
  { agency: '환경부', dept: '환경정책과', baseTitle: '환경정보 통합관리 시스템 유지보수', workType: '일반용역', basePrice: 80_000_000, month: 1, recurringYears: [2023, 2024, 2025], baseWinner: '대우정보시스템' },
  { agency: '행정안전부', dept: '정보화담당관', baseTitle: '전자정부 정보보안 취약점 점검', workType: '기술용역', basePrice: 250_000_000, month: 3, recurringYears: [2023, 2024, 2025], baseWinner: '케이사인' },
  { agency: '교육부', dept: '교육정보화과', baseTitle: '교육행정정보시스템 운영 지원', workType: '일반용역', basePrice: 500_000_000, month: 1, recurringYears: [2023, 2024, 2025], baseWinner: 'LG CNS' },
  { agency: '보건복지부', dept: '사회서비스정책과', baseTitle: '복지정보 통합포털 운영 및 유지관리', workType: '일반용역', basePrice: 200_000_000, month: 2, recurringYears: [2023, 2024, 2025], baseWinner: '아이티센' },
  { agency: '과학기술정보통신부', dept: 'ICT인프라과', baseTitle: '국가 사이버보안 체계 고도화', workType: '기술용역', basePrice: 800_000_000, month: 4, recurringYears: [2023, 2024, 2025], baseWinner: 'SK주식회사 C&C' },
  { agency: '서울특별시', dept: '정보화추진단', baseTitle: '스마트시티 데이터 허브 운영', workType: '기술용역', basePrice: 600_000_000, month: 3, recurringYears: [2023, 2024, 2025], baseWinner: '삼성SDS' },
  { agency: '경기도', dept: '정보화과', baseTitle: '공공 앱 통합관리 시스템 유지보수', workType: '일반용역', basePrice: 120_000_000, month: 2, recurringYears: [2023, 2024, 2025], baseWinner: '더존비즈온' },
  { agency: '한국도로공사', dept: '정보화처', baseTitle: '고속도로 교통정보 시스템 유지관리', workType: '일반용역', basePrice: 450_000_000, month: 1, recurringYears: [2023, 2024, 2025], baseWinner: '현대오토에버' },
  { agency: '한국전력공사', dept: '정보전략처', baseTitle: '전력 빅데이터 분석 플랫폼 운영', workType: '기술용역', basePrice: 700_000_000, month: 5, recurringYears: [2023, 2024, 2025], baseWinner: 'KT DS' },
  { agency: '국민건강보험공단', dept: '정보화실', baseTitle: '건강보험 정보시스템 유지관리 및 운영', workType: '일반용역', basePrice: 1_200_000_000, month: 1, recurringYears: [2023, 2024, 2025], baseWinner: '삼성SDS' },
  { agency: '한국철도공사', dept: '정보화본부', baseTitle: '철도 예약발매 시스템 유지관리', workType: '일반용역', basePrice: 800_000_000, month: 2, recurringYears: [2023, 2024, 2025], baseWinner: 'LG CNS' },
  { agency: '국토교통부', dept: '도로정책과', baseTitle: 'GIS 기반 국토정보 플랫폼 유지보수', workType: '기술용역', basePrice: 350_000_000, month: 6, recurringYears: [2023, 2024, 2025], baseWinner: '한국IBM' },
  { agency: '한국수자원공사', dept: 'IT기획처', baseTitle: '수자원 원격감시 시스템 운영', workType: '일반용역', basePrice: 300_000_000, month: 3, recurringYears: [2023, 2024, 2025], baseWinner: '시큐레이어' },
  // 2년 연속 (2024~2025)
  { agency: '행정안전부', dept: '정보화담당관', baseTitle: '공공기관 클라우드 전환 지원', workType: '기술용역', basePrice: 500_000_000, month: 4, recurringYears: [2024, 2025], baseWinner: 'NAVER Cloud' },
  { agency: '산업통상자원부', dept: '산업정책과', baseTitle: '산업데이터 플랫폼 구축 및 운영', workType: '기술용역', basePrice: 400_000_000, month: 5, recurringYears: [2024, 2025], baseWinner: '카카오엔터프라이즈' },
  { agency: '국민연금공단', dept: '정보화본부', baseTitle: '연금관리 정보시스템 유지보수', workType: '일반용역', basePrice: 600_000_000, month: 1, recurringYears: [2024, 2025], baseWinner: 'SK주식회사 C&C' },
  { agency: '부산광역시', dept: '정보통신과', baseTitle: '스마트항만 통합관제 시스템 운영', workType: '기술용역', basePrice: 350_000_000, month: 3, recurringYears: [2024, 2025], baseWinner: '롯데정보통신' },
  // 2년 연속 (2023~2024)
  { agency: '한국토지주택공사', dept: 'IT기획처', baseTitle: '주거복지 정보시스템 유지관리', workType: '일반용역', basePrice: 280_000_000, month: 2, recurringYears: [2023, 2024], baseWinner: '대우정보시스템' },
  { agency: '문화체육관광부', dept: '문화산업과', baseTitle: '문화예술 정보시스템 통합 운영', workType: '일반용역', basePrice: 180_000_000, month: 4, recurringYears: [2023, 2024], baseWinner: '이지스시스템즈' },
];

const ONE_TIME_TEMPLATES: Array<{ title: string; workType: WorkType; minPrice: number; maxPrice: number }> = [
  { title: 'BPR/ISP 수립 용역', workType: '기술용역', minPrice: 200_000_000, maxPrice: 800_000_000 },
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
  { title: '스마트시티 플랫폼 구축', workType: '기술용역', minPrice: 1_000_000_000, maxPrice: 5_000_000_000 },
  { title: '디지털트윈 구축 용역', workType: '기술용역', minPrice: 500_000_000, maxPrice: 2_500_000_000 },
  { title: '챗봇 서비스 구축', workType: '기술용역', minPrice: 100_000_000, maxPrice: 500_000_000 },
];

const ALL_AGENCIES = [
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
  { name: '한국산업안전보건공단', dept: '정보화팀' },
  { name: '행정공제회', dept: 'IT팀' },
];

const ALL_WINNERS = [
  'LG CNS', 'SK주식회사 C&C', '삼성SDS', 'KT DS', '롯데정보통신',
  '현대오토에버', 'NAVER Cloud', '카카오엔터프라이즈', '쌍용정보통신',
  '대우정보시스템', '한국IBM', '아이티센', '더존비즈온', '케이사인',
  '시큐레이어', '이지스시스템즈', '비씨카드', '롯데정보통신', '인포소닉',
  '디지털대성', 'KCC정보통신', '대신정보통신',
];

function fmtDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(Math.max(1, Math.min(28, day))).padStart(2, '0')}`;
}

function seedMultiYearData(db: ReturnType<typeof getDb>): Record<string, number> {
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

  const counts: Record<string, number> = { 2023: 0, 2024: 0, 2025: 0 };

  const insertAll = db.transaction(() => {
    // ── A. 연속사업 삽입 ──
    for (const rp of RECURRING_PROJECTS) {
      let prevWinner = rp.baseWinner;

      for (const year of rp.recurringYears) {
        // 연도별 가격 상승 (약 5~8%/년)
        const yearOffset = year - Math.min(...rp.recurringYears);
        const priceGrowth = 1 + yearOffset * (0.05 + Math.random() * 0.03);
        const estimated = Math.round(rp.basePrice * priceGrowth / 10_000) * 10_000;
        const awarded = Math.round(estimated * (0.78 + Math.random() * 0.15) / 10_000) * 10_000;

        // 낙찰업체: 70% 확률로 동일, 30% 확률로 교체
        const winner = Math.random() < 0.72 ? prevWinner
          : ALL_WINNERS[Math.floor(Math.random() * ALL_WINNERS.length)];
        prevWinner = winner;

        const day = 5 + Math.floor(Math.random() * 20);
        const announcedAt = fmtDate(year, rp.month, day);
        const deadlineAt = fmtDate(year, rp.month, day + 20);
        const contractAt = fmtDate(year, rp.month + 2, day);

        // 사전규격: 발주일 - 14~28일
        const preSpecDays = 14 + Math.floor(Math.random() * 15);
        const preDate = new Date(year, rp.month - 1, day - preSpecDays);
        const publishedAt = fmtDate(preDate.getFullYear(), preDate.getMonth() + 1, preDate.getDate());

        const slug = `${year}-${rp.agency.slice(0, 4)}-${rp.baseTitle.slice(0, 6)}`.replace(/\s/g, '');
        const bidId = `BID-R-${slug}`;
        const preSpecId = `PRE-R-${slug}`;
        // 제목에 연도 명시 (정규화 시 제거됨)
        const title = `${year}년도 ${rp.agency} ${rp.baseTitle}`;

        insertPreSpec.run(
          preSpecId, title, rp.agency, rp.dept, rp.workType,
          publishedAt, estimated,
          `https://www.g2b.go.kr:8101/ep/preparation/prepareOutlineList.do?preSpecNo=${preSpecId}`,
          bidId,
        );
        insertBid.run(
          bidId, title, rp.agency, rp.dept, rp.workType,
          announcedAt, deadlineAt, contractAt,
          estimated, awarded, winner,
          `https://www.g2b.go.kr:8101/ep/invitation/publish/bidPublishDetail.do?bidno=${bidId}`,
          preSpecId,
        );
        counts[String(year)]++;
      }
    }

    // ── B. 단발성 사업 삽입 (연도별 월 4~6건) ──
    for (const year of [2023, 2024, 2025]) {
      for (let month = 1; month <= 12; month++) {
        const cnt = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < cnt; i++) {
          const agency = ALL_AGENCIES[Math.floor(Math.random() * ALL_AGENCIES.length)];
          const tmpl = ONE_TIME_TEMPLATES[Math.floor(Math.random() * ONE_TIME_TEMPLATES.length)];
          const winner = ALL_WINNERS[Math.floor(Math.random() * ALL_WINNERS.length)];

          const day = 1 + Math.floor(Math.random() * 25);
          const announcedAt = fmtDate(year, month, day);
          const deadlineAt = fmtDate(year, month, day + 18);
          const contractAt = fmtDate(year, month + 2, day + 5);

          const preSpecDays = 12 + Math.floor(Math.random() * 18);
          const preDate = new Date(year, month - 1, day - preSpecDays);
          const publishedAt = fmtDate(preDate.getFullYear(), preDate.getMonth() + 1, preDate.getDate());

          const estimated = tmpl.minPrice + Math.floor(Math.random() * (tmpl.maxPrice - tmpl.minPrice));
          const awarded = Math.round(estimated * (0.76 + Math.random() * 0.18) / 10_000) * 10_000;

          const bidId = `BID-${year}-${String(month).padStart(2, '0')}-${String(i).padStart(3, '0')}-${ALL_AGENCIES.indexOf(agency)}`;
          const preSpecId = `PRE-${year}-${String(month).padStart(2, '0')}-${String(i).padStart(3, '0')}-${ALL_AGENCIES.indexOf(agency)}`;
          const title = `${agency.name} ${tmpl.title}`;

          insertPreSpec.run(
            preSpecId, title, agency.name, agency.dept, tmpl.workType,
            publishedAt, estimated,
            `https://www.g2b.go.kr:8101/ep/preparation/prepareOutlineList.do?preSpecNo=${preSpecId}`,
            bidId,
          );
          insertBid.run(
            bidId, title, agency.name, agency.dept, tmpl.workType,
            announcedAt, deadlineAt, contractAt,
            estimated, awarded, winner,
            `https://www.g2b.go.kr:8101/ep/invitation/publish/bidPublishDetail.do?bidno=${bidId}`,
            preSpecId,
          );
          counts[String(year)]++;
        }
      }
    }
  });

  insertAll();
  return counts;
}
