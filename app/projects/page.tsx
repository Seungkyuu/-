'use client';

import { useState, useEffect, useCallback } from 'react';
import ProjectTable from '@/components/ProjectTable';
import { WORK_TYPES } from '@/lib/constants';

interface ProjectsResponse {
  data: ProjectRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

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

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function ProjectsPage() {
  const [workType, setWorkType] = useState('');
  const [agency, setAgency] = useState('');
  const [month, setMonth] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('announced_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [page, setPage] = useState(1);

  const [data, setData] = useState<ProjectRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        workType, agency, month, minPrice, maxPrice,
        sortBy, sortOrder, page: String(page), pageSize: '20',
      });
      const res = await fetch(`/api/projects?${params}`);
      const json: ProjectsResponse = await res.json();
      setData(json.data || []);
      setTotal(json.total || 0);
      setTotalPages(json.totalPages || 1);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [workType, agency, month, minPrice, maxPrice, sortBy, sortOrder, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortOrder((o) => (o === 'DESC' ? 'ASC' : 'DESC'));
    } else {
      setSortBy(col);
      setSortOrder('DESC');
    }
    setPage(1);
  };

  const handleFilter = () => {
    setPage(1);
    fetchData();
  };

  const handleReset = () => {
    setWorkType('');
    setAgency('');
    setMonth('');
    setMinPrice('');
    setMaxPrice('');
    setPage(1);
  };

  const exportUrl = `/api/projects/export?workType=${workType}&agency=${agency}&month=${month}`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">사업 목록</h1>
          <p className="text-sm text-gray-500 mt-0.5">2025년 입찰공고 전체 · 총 {total.toLocaleString()}건</p>
        </div>
        <a
          href={exportUrl}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          엑셀 다운로드
        </a>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">업무구분</label>
            <select
              value={workType}
              onChange={(e) => { setWorkType(e.target.value); setPage(1); }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">전체</option>
              {WORK_TYPES.map((wt) => (
                <option key={wt} value={wt}>{wt}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">발주기관</label>
            <input
              type="text"
              value={agency}
              onChange={(e) => setAgency(e.target.value)}
              placeholder="기관명 검색"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">월</label>
            <select
              value={month}
              onChange={(e) => { setMonth(e.target.value); setPage(1); }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">전체</option>
              {MONTHS.map((m) => (
                <option key={m} value={String(m)}>{m}월</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">최소 금액 (원)</label>
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="100000000"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">최대 금액 (원)</label>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="1000000000"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleFilter}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            검색
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm rounded-lg transition-colors"
          >
            초기화
          </button>
        </div>
      </div>

      {/* 테이블 */}
      {loading ? (
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      ) : (
        <ProjectTable
          data={data}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
        />
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            이전
          </button>
          <span className="text-sm text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
