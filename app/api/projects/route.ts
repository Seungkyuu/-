import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);

    const workType = searchParams.get('workType') || '';
    const agency = searchParams.get('agency') || '';
    const month = searchParams.get('month') || '';
    const minPrice = searchParams.get('minPrice') || '';
    const maxPrice = searchParams.get('maxPrice') || '';
    const sortBy = searchParams.get('sortBy') || 'announced_at';
    const sortOrder = searchParams.get('sortOrder') || 'DESC';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const validSortColumns: Record<string, string> = {
      announced_at: 'b.announced_at',
      estimated_price: 'b.estimated_price',
      agency: 'b.agency',
      title: 'b.title',
    };
    const sortCol = validSortColumns[sortBy] || 'b.announced_at';
    const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const conditions: string[] = ["b.announced_at BETWEEN '2025-01-01' AND '2025-12-31'"];
    const params: (string | number)[] = [];

    if (workType) {
      conditions.push('b.work_type = ?');
      params.push(workType);
    }
    if (agency) {
      conditions.push('b.agency LIKE ?');
      params.push(`%${agency}%`);
    }
    if (month) {
      conditions.push("CAST(strftime('%m', b.announced_at) AS INTEGER) = ?");
      params.push(parseInt(month));
    }
    if (minPrice) {
      conditions.push('b.estimated_price >= ?');
      params.push(parseInt(minPrice));
    }
    if (maxPrice) {
      conditions.push('b.estimated_price <= ?');
      params.push(parseInt(maxPrice));
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = db.prepare(`
      SELECT COUNT(*) as total FROM bids b ${where}
    `).get(...params) as { total: number };

    const offset = (page - 1) * pageSize;
    const rows = db.prepare(`
      SELECT
        b.*,
        p.published_at as pre_spec_published_at,
        p.url as pre_spec_url,
        m.memo, m.status as memo_status,
        CAST(
          JULIANDAY(b.announced_at) - JULIANDAY(p.published_at)
        AS INTEGER) as lead_time
      FROM bids b
      LEFT JOIN pre_specs p ON b.pre_spec_id = p.id
      LEFT JOIN sales_memos m ON b.id = m.bid_id
      ${where}
      ORDER BY ${sortCol} ${order}
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    return NextResponse.json({
      data: rows,
      total: countRow.total,
      page,
      pageSize,
      totalPages: Math.ceil(countRow.total / pageSize),
    });
  } catch (error) {
    console.error('Projects 오류:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
