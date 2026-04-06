import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);

    const workType = searchParams.get('workType') || '';
    const agency = searchParams.get('agency') || '';
    const month = searchParams.get('month') || '';

    const conditions: string[] = ["announced_at BETWEEN '2025-01-01' AND '2025-12-31'"];
    const params: (string | number)[] = [];

    if (workType) { conditions.push('work_type = ?'); params.push(workType); }
    if (agency) { conditions.push('agency LIKE ?'); params.push(`%${agency}%`); }
    if (month) {
      conditions.push("CAST(strftime('%m', announced_at) AS INTEGER) = ?");
      params.push(parseInt(month));
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const rows = db.prepare(`
      SELECT
        id as '공고번호',
        title as '사업명',
        agency as '발주기관',
        dept as '부서명',
        work_type as '업무구분',
        announced_at as '입찰공고일',
        deadline_at as '입찰마감일',
        contract_at as '계약일',
        estimated_price as '추정가격(원)',
        awarded_price as '낙찰금액(원)',
        winner as '낙찰업체',
        url as '공고URL'
      FROM bids ${where}
      ORDER BY announced_at DESC
    `).all(...params);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, '입찰공고목록');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="g2b_projects_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
