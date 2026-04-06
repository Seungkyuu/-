import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// 특정 메모 조회
export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const bidId = new URL(req.url).searchParams.get('bidId');

    if (bidId) {
      const memo = db.prepare('SELECT * FROM sales_memos WHERE bid_id = ?').get(bidId);
      return NextResponse.json(memo || null);
    }

    const memos = db.prepare('SELECT * FROM sales_memos ORDER BY updated_at DESC').all();
    return NextResponse.json(memos);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// 메모 저장/업데이트
export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { bid_id, memo, status } = body;

    if (!bid_id) {
      return NextResponse.json({ error: 'bid_id 필수' }, { status: 400 });
    }

    const validStatuses = ['관심', '진행중', '완료', '패스'];
    const safeStatus = validStatuses.includes(status) ? status : '관심';

    db.prepare(`
      INSERT INTO sales_memos (bid_id, memo, status, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(bid_id) DO UPDATE SET
        memo = excluded.memo,
        status = excluded.status,
        updated_at = CURRENT_TIMESTAMP
    `).run(bid_id, memo || '', safeStatus);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// 메모 삭제
export async function DELETE(req: NextRequest) {
  try {
    const db = getDb();
    const bidId = new URL(req.url).searchParams.get('bidId');

    if (!bidId) {
      return NextResponse.json({ error: 'bidId 필수' }, { status: 400 });
    }

    db.prepare('DELETE FROM sales_memos WHERE bid_id = ?').run(bidId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
