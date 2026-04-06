import { NextRequest, NextResponse } from 'next/server';
import { collectBids, collectPreSpecs } from '@/lib/collector';
import { getDb } from '@/lib/db';
import { validateDatabase, type ValidationReport } from '@/lib/validation';

export async function POST(req: NextRequest) {
  const apiKey = process.env.PUBLIC_DATA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'API 키 미설정',
        message:
          '.env.local에 PUBLIC_DATA_API_KEY를 설정하세요. ' +
          '키 없이 테스트하려면 POST /api/init 으로 샘플 데이터를 초기화하세요.',
      },
      { status: 400 }
    );
  }

  const url = new URL(req.url);
  const yearsParam = url.searchParams.get('years') || '2023,2024,2025';
  const years = yearsParam.split(',').map(Number).filter((y) => y >= 2020 && y <= 2030);

  if (years.length === 0) {
    return NextResponse.json({ error: '유효한 연도가 없습니다 (years=2023,2024,2025)' }, { status: 400 });
  }

  const results: Array<{
    year: number;
    bidCount: number;
    preSpecCount: number;
    validation: ValidationReport;
    durationMs: number;
  }> = [];

  let totalBids = 0;
  let totalPreSpecs = 0;
  let hasError = false;

  for (const year of years) {
    const start = Date.now();
    try {
      const [bidCount, preSpecCount] = await Promise.all([
        collectBids(year),
        collectPreSpecs(year),
      ]);
      totalBids += bidCount;
      totalPreSpecs += preSpecCount;

      // ── 수집 후 검증 ──
      const db = getDb();
      const validation = validateDatabase(db, year);

      if (validation.summary === 'fail') hasError = true;

      results.push({
        year,
        bidCount,
        preSpecCount,
        validation,
        durationMs: Date.now() - start,
      });
    } catch (error) {
      hasError = true;
      results.push({
        year,
        bidCount: 0,
        preSpecCount: 0,
        validation: {
          year,
          runAt: new Date().toISOString(),
          totalChecks: 0,
          passedChecks: 0,
          failedErrors: 1,
          failedWarnings: 0,
          checks: [{
            stage: '수집 오류',
            description: String(error),
            expected: '정상',
            actual: '오류',
            passed: false,
            severity: 'error',
          }],
          summary: 'fail',
        },
        durationMs: Date.now() - start,
      });
    }
  }

  return NextResponse.json({
    success: !hasError,
    years,
    totalBids,
    totalPreSpecs,
    message: `${years.join(', ')}년 데이터 수집 ${hasError ? '부분 실패' : '완료'}: 입찰 ${totalBids}건, 사전규격 ${totalPreSpecs}건`,
    results,
  }, { status: hasError ? 207 : 200 });
}

export async function GET() {
  const hasApiKey = Boolean(process.env.PUBLIC_DATA_API_KEY);

  let dbStatus: { bidCount: number; yearBreakdown: Array<{ year: string; count: number }> } | null = null;
  try {
    const db = getDb();
    const bidCount = (db.prepare('SELECT COUNT(*) as c FROM bids').get() as { c: number }).c;
    const yearBreakdown = db.prepare(
      `SELECT strftime('%Y', announced_at) as year, COUNT(*) as count FROM bids GROUP BY year ORDER BY year`
    ).all() as Array<{ year: string; count: number }>;
    dbStatus = { bidCount, yearBreakdown };
  } catch {
    // DB 없는 경우 무시
  }

  return NextResponse.json({
    hasApiKey,
    dbStatus,
    usage: {
      collect: 'POST /api/collect?years=2023,2024,2025',
      sampleData: 'POST /api/init',
    },
    message: hasApiKey
      ? 'API 키 설정됨. POST /api/collect?years=2023,2024,2025 으로 수집 시작'
      : 'API 키 미설정. POST /api/init 으로 샘플 데이터 로드',
  });
}
