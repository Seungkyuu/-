import { NextRequest, NextResponse } from 'next/server';
import { collectBids, collectPreSpecs } from '@/lib/collector';

// POST /api/collect — API 수집 트리거 (cron 또는 수동)
export async function POST(req: NextRequest) {
  const apiKey = process.env.PUBLIC_DATA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'API 키 미설정',
        message:
          '.env.local에 PUBLIC_DATA_API_KEY를 설정하세요. ' +
          '키 없이 테스트하려면 /api/init (POST)으로 샘플 데이터를 초기화하세요.',
      },
      { status: 400 }
    );
  }

  try {
    const year = parseInt(new URL(req.url).searchParams.get('year') || '2025');

    const [bidCount, preSpecCount] = await Promise.all([
      collectBids(year),
      collectPreSpecs(year),
    ]);

    return NextResponse.json({
      success: true,
      year,
      bidCount,
      preSpecCount,
      message: `${year}년 입찰공고 ${bidCount}건, 사전규격 ${preSpecCount}건 수집 완료`,
    });
  } catch (error) {
    console.error('수집 오류:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// GET — 수집 상태 조회
export async function GET() {
  const hasApiKey = Boolean(process.env.PUBLIC_DATA_API_KEY);
  return NextResponse.json({
    hasApiKey,
    message: hasApiKey
      ? 'API 키가 설정되어 있습니다. POST 요청으로 수집을 시작하세요.'
      : 'API 키 미설정. /api/init (POST)으로 샘플 데이터를 사용하세요.',
  });
}
