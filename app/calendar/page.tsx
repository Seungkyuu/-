'use client';

import { useEffect, useState } from 'react';
import CalendarView from '@/components/CalendarView';

interface CalendarData {
  events: CalendarEvent[];
  byMonth: Record<number, CalendarEvent[]>;
  avgLeadTime: number;
  totalEvents: number;
}

interface CalendarEvent {
  bid_id: string;
  title: string;
  agency: string;
  work_type: string;
  expected_bid_date: string;
  expected_pre_spec_date: string;
  prev_estimated_price: number | null;
  prev_winner: string | null;
  memo: string | null;
  memo_status: string | null;
  alert_status: 'normal' | 'prepare' | 'action' | 'past';
  days_until_pre_spec: number;
  url: string | null;
}

export default function CalendarPage() {
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterWorkType, setFilterWorkType] = useState<string>('');

  useEffect(() => {
    fetch('/api/calendar')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">영업 캘린더</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-gray-400">
        데이터를 불러올 수 없습니다. 대시보드에서 데이터를 초기화하세요.
      </div>
    );
  }

  // 필터 적용
  let filteredByMonth = data.byMonth;
  if (filterStatus || filterWorkType) {
    filteredByMonth = {} as Record<number, CalendarEvent[]>;
    for (let m = 1; m <= 12; m++) {
      filteredByMonth[m] = (data.byMonth[m] || []).filter((ev) => {
        if (filterStatus && ev.alert_status !== filterStatus) return false;
        if (filterWorkType && ev.work_type !== filterWorkType) return false;
        return true;
      });
    }
  }

  // 긴급 알림 (D-7 이내)
  const actionItems = data.events.filter((e) => e.alert_status === 'action');
  const prepareItems = data.events.filter((e) => e.alert_status === 'prepare');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">2026년 영업 캘린더</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          2025년 실적 기반 예상 발주 일정 · 전체 {data.totalEvents}건 예측
        </p>
      </div>

      {/* 긴급 알림 배너 */}
      {(actionItems.length > 0 || prepareItems.length > 0) && (
        <div className="space-y-2">
          {actionItems.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-red-500 font-bold text-lg">!</span>
              <div>
                <p className="text-sm font-semibold text-red-700">
                  영업 착수 필요 — {actionItems.length}건 (D-7 이내 사전규격공고 예정)
                </p>
                <p className="text-xs text-red-500 mt-0.5">
                  {actionItems.slice(0, 3).map((e) => e.agency).join(', ')}
                  {actionItems.length > 3 && ` 외 ${actionItems.length - 3}개 기관`}
                </p>
              </div>
            </div>
          )}
          {prepareItems.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-yellow-500 font-bold text-lg">△</span>
              <div>
                <p className="text-sm font-semibold text-yellow-700">
                  준비 필요 — {prepareItems.length}건 (D-30 이내 사전규격공고 예정)
                </p>
                <p className="text-xs text-yellow-600 mt-0.5">
                  {prepareItems.slice(0, 3).map((e) => e.agency).join(', ')}
                  {prepareItems.length > 3 && ` 외 ${prepareItems.length - 3}개 기관`}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 필터 */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="">전체 상태</option>
          <option value="action">영업 착수 필요</option>
          <option value="prepare">준비 필요</option>
          <option value="normal">일반</option>
          <option value="past">지남</option>
        </select>
        <select
          value={filterWorkType}
          onChange={(e) => setFilterWorkType(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="">전체 업무구분</option>
          <option value="일반용역">일반용역</option>
          <option value="기타">기타</option>
          <option value="민간">민간</option>
          <option value="기술용역">기술용역</option>
        </select>
        {(filterStatus || filterWorkType) && (
          <button
            onClick={() => { setFilterStatus(''); setFilterWorkType(''); }}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-500 hover:bg-gray-50"
          >
            필터 초기화
          </button>
        )}
      </div>

      {/* 캘린더 */}
      <CalendarView byMonth={filteredByMonth} avgLeadTime={data.avgLeadTime} />
    </div>
  );
}
