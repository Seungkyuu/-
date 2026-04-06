'use client';

import { useState } from 'react';
import { formatDate, formatPrice } from '@/lib/utils';
import ProjectModal from './ProjectModal';
import clsx from 'clsx';

interface ProjectRow {
  id: string;
  title: string;
  agency: string;
  dept: string | null;
  work_type: string;
  announced_at: string | null;
  deadline_at: string | null;
  contract_at: string | null;
  estimated_price: number | null;
  awarded_price: number | null;
  winner: string | null;
  url: string | null;
  pre_spec_published_at: string | null;
  pre_spec_url: string | null;
  lead_time: number | null;
  memo: string | null;
  memo_status: string | null;
}

interface Props {
  data: ProjectRow[];
  sortBy: string;
  sortOrder: string;
  onSort: (col: string) => void;
}

const WORK_TYPE_COLORS: Record<string, string> = {
  기술용역: 'bg-purple-100 text-purple-700',
  일반용역: 'bg-blue-100 text-blue-700',
  민간: 'bg-orange-100 text-orange-700',
  기타: 'bg-gray-100 text-gray-600',
};

const STATUS_COLORS: Record<string, string> = {
  관심: 'text-blue-600',
  진행중: 'text-yellow-600',
  완료: 'text-green-600',
  패스: 'text-gray-400',
};

export default function ProjectTable({ data, sortBy, sortOrder, onSort }: Props) {
  const [selected, setSelected] = useState<ProjectRow | null>(null);

  const handleMemoSave = async (bidId: string, memo: string, status: string) => {
    await fetch('/api/memos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bid_id: bidId, memo, status }),
    });
    if (selected) {
      setSelected({ ...selected, memo, memo_status: status });
    }
  };

  const SortHeader = ({ col, label }: { col: string; label: string }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
      onClick={() => onSort(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortBy === col && (
          <span className="text-blue-500">{sortOrder === 'DESC' ? '↓' : '↑'}</span>
        )}
      </span>
    </th>
  );

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <SortHeader col="title" label="사업명" />
              <SortHeader col="agency" label="발주기관" />
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                업무구분
              </th>
              <SortHeader col="announced_at" label="입찰공고일" />
              <SortHeader col="estimated_price" label="추정가격" />
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                리드타임
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                낙찰업체
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {data.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">
                  데이터가 없습니다.
                </td>
              </tr>
            )}
            {data.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                onClick={() => setSelected(row)}
              >
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900 line-clamp-2 max-w-xs">
                    {row.title}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-gray-700 whitespace-nowrap">{row.agency}</p>
                  {row.dept && (
                    <p className="text-xs text-gray-400">{row.dept}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={clsx(
                      'inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
                      WORK_TYPE_COLORS[row.work_type] || 'bg-gray-100 text-gray-600'
                    )}
                  >
                    {row.work_type}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {formatDate(row.announced_at)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap font-medium">
                  {formatPrice(row.estimated_price)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                  {row.lead_time != null ? `${row.lead_time}일` : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap max-w-[120px] truncate">
                  {row.winner || '-'}
                </td>
                <td className="px-4 py-3">
                  {row.memo_status && (
                    <span
                      className={clsx(
                        'text-xs font-medium',
                        STATUS_COLORS[row.memo_status] || 'text-gray-500'
                      )}
                    >
                      {row.memo_status}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <ProjectModal
          project={selected}
          onClose={() => setSelected(null)}
          onMemoSave={handleMemoSave}
        />
      )}
    </>
  );
}
