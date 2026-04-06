'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { formatPrice } from '@/lib/utils';

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

interface Props {
  byMonth: Record<number, CalendarEvent[]>;
  avgLeadTime: number;
}

const MONTHS = [
  '1월','2월','3월','4월','5월','6월',
  '7월','8월','9월','10월','11월','12월',
];

const WORK_TYPE_COLORS: Record<string, string> = {
  기술용역: 'border-l-purple-400 bg-purple-50',
  일반용역: 'border-l-blue-400 bg-blue-50',
  민간: 'border-l-orange-400 bg-orange-50',
  기타: 'border-l-gray-300 bg-gray-50',
};

const ALERT_BADGE: Record<string, { text: string; cls: string }> = {
  normal: { text: '', cls: '' },
  prepare: { text: '준비 필요', cls: 'bg-yellow-100 text-yellow-700' },
  action: { text: '영업 착수!', cls: 'bg-red-100 text-red-700 font-bold' },
  past: { text: '지남', cls: 'bg-gray-100 text-gray-400' },
};

interface PopupProps {
  month: number;
  events: CalendarEvent[];
  onClose: () => void;
}

function MonthPopup({ month, events, onClose }: PopupProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900">2026년 {month}월 예상 발주</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        <div className="p-4 space-y-3">
          {events.length === 0 && (
            <p className="text-sm text-gray-400 py-8 text-center">예상 사업이 없습니다.</p>
          )}
          {events.map((ev) => {
            const alert = ALERT_BADGE[ev.alert_status];
            return (
              <div
                key={ev.bid_id}
                className={clsx(
                  'border-l-4 rounded-lg p-4',
                  WORK_TYPE_COLORS[ev.work_type] || 'border-l-gray-300 bg-gray-50'
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold text-gray-900 leading-snug">{ev.title}</p>
                  {alert.text && (
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full whitespace-nowrap', alert.cls)}>
                      {alert.text}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-2">{ev.agency}</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <span>예상 발주: {ev.expected_bid_date}</span>
                  <span>예상 사전규격: {ev.expected_pre_spec_date}</span>
                  <span>작년 추정가: {formatPrice(ev.prev_estimated_price)}</span>
                  <span>작년 낙찰: {ev.prev_winner || '-'}</span>
                </div>
                {ev.memo && (
                  <div className="mt-2 p-2 bg-white/70 rounded text-xs text-gray-600 border border-gray-200">
                    {ev.memo}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function CalendarView({ byMonth, avgLeadTime }: Props) {
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const currentMonth = new Date().getFullYear() === 2026 ? new Date().getMonth() + 1 : null;

  return (
    <div>
      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <p className="text-xs text-gray-500">
          평균 리드타임 <strong>{avgLeadTime}일</strong> 기준으로 예상 사전규격공고일 산출
        </p>
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> 영업 착수 (D-7 이내)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> 준비 필요 (D-30 이내)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {MONTHS.map((label, idx) => {
          const month = idx + 1;
          const events = byMonth[month] || [];
          const actionCount = events.filter((e) => e.alert_status === 'action').length;
          const prepareCount = events.filter((e) => e.alert_status === 'prepare').length;
          const isCurrentMonth = currentMonth === month;

          return (
            <div
              key={month}
              className={clsx(
                'rounded-xl border p-4 cursor-pointer hover:shadow-md transition-all',
                isCurrentMonth
                  ? 'border-blue-400 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-blue-200',
                events.length === 0 && 'opacity-60'
              )}
              onClick={() => setSelectedMonth(month)}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-800">2026. {label}</h3>
                {isCurrentMonth && (
                  <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">이번달</span>
                )}
              </div>

              <div className="space-y-1 mb-3">
                {events.slice(0, 4).map((ev) => {
                  const alert = ALERT_BADGE[ev.alert_status];
                  return (
                    <div
                      key={ev.bid_id}
                      className={clsx(
                        'text-xs rounded px-2 py-1 border-l-2 truncate',
                        ev.alert_status === 'action'
                          ? 'border-l-red-400 bg-red-50 text-red-700'
                          : ev.alert_status === 'prepare'
                          ? 'border-l-yellow-400 bg-yellow-50 text-yellow-700'
                          : ev.alert_status === 'past'
                          ? 'border-l-gray-200 bg-gray-50 text-gray-400'
                          : 'border-l-blue-300 bg-blue-50 text-blue-700'
                      )}
                      title={ev.title}
                    >
                      {ev.agency.length > 8 ? ev.agency.slice(0, 8) + '…' : ev.agency}
                    </div>
                  );
                })}
                {events.length > 4 && (
                  <p className="text-xs text-gray-400 pl-2">+{events.length - 4}건 더보기</p>
                )}
              </div>

              <div className="border-t border-gray-100 pt-2 flex items-center justify-between">
                <span className="text-xs text-gray-500">총 {events.length}건</span>
                <div className="flex gap-1">
                  {actionCount > 0 && (
                    <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                      착수 {actionCount}
                    </span>
                  )}
                  {prepareCount > 0 && (
                    <span className="text-xs bg-yellow-100 text-yellow-600 px-1.5 py-0.5 rounded">
                      준비 {prepareCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedMonth !== null && (
        <MonthPopup
          month={selectedMonth}
          events={byMonth[selectedMonth] || []}
          onClose={() => setSelectedMonth(null)}
        />
      )}
    </div>
  );
}
