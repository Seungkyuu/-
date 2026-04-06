'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { formatPrice, formatDate } from '@/lib/utils';
import type { RecurringProject } from '@/lib/recurring';

interface Props {
  data: RecurringProject[];
  summary: {
    total: number;
    threeYearPlus: number;
    twoYear: number;
    sameWinner: number;
    winnerChanged: number;
    highAlert: number;
    mediumAlert: number;
  };
}

const ALERT_STYLE: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-gray-100 text-gray-500 border-gray-200',
};

const ALERT_LABEL: Record<string, string> = {
  high: '고우선',
  medium: '중우선',
  low: '일반',
};

const TREND_ICON: Record<string, string> = {
  up: '↑',
  down: '↓',
  stable: '→',
  unknown: '-',
};

const TREND_COLOR: Record<string, string> = {
  up: 'text-red-500',
  down: 'text-blue-500',
  stable: 'text-green-500',
  unknown: 'text-gray-400',
};

export default function RecurringProjectsTable({ data, summary }: Props) {
  const [filterAlert, setFilterAlert] = useState<string>('');
  const [filterYears, setFilterYears] = useState<number>(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = data.filter((r) => {
    if (filterAlert && r.alert !== filterAlert) return false;
    if (filterYears && r.years.length < filterYears) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* 요약 카드 */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <SummaryCard label="연속사업 총계" value={`${summary.total}건`} color="blue" />
        <SummaryCard label="3년 이상" value={`${summary.threeYearPlus}건`} color="purple" />
        <SummaryCard label="2년" value={`${summary.twoYear}건`} color="indigo" />
        <SummaryCard label="동일 낙찰업체" value={`${summary.sameWinner}건`} color="orange" />
        <SummaryCard label="업체 교체됨" value={`${summary.winnerChanged}건`} color="green" />
        <SummaryCard label="고우선 영업" value={`${summary.highAlert}건`} color="red" />
      </div>

      {/* 필터 */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterAlert('')}
          className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium border', !filterAlert ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 text-gray-500')}
        >전체</button>
        {['high', 'medium', 'low'].map((a) => (
          <button
            key={a}
            onClick={() => setFilterAlert(a === filterAlert ? '' : a)}
            className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium border', filterAlert === a ? ALERT_STYLE[a] : 'border-gray-200 text-gray-500')}
          >{ALERT_LABEL[a]}</button>
        ))}
        <div className="w-px bg-gray-200 mx-1" />
        {[2, 3].map((n) => (
          <button
            key={n}
            onClick={() => setFilterYears(filterYears === n ? 0 : n)}
            className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium border', filterYears === n ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-500')}
          >{n}년 이상</button>
        ))}
        <span className="text-xs text-gray-400 self-center ml-2">
          {filtered.length}건 표시
        </span>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">우선도</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">사업명 (정규화)</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">발주기관</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">업무구분</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">출현 연도</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">가격추세</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">주 낙찰업체</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">업체 변경</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="py-10 text-center text-sm text-gray-400">해당 데이터 없음</td></tr>
            )}
            {filtered.map((r) => (
              <>
                <tr
                  key={r.key}
                  className="hover:bg-blue-50/40 cursor-pointer"
                  onClick={() => setExpanded(expanded === r.key ? null : r.key)}
                >
                  <td className="px-4 py-3">
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium border', ALERT_STYLE[r.alert])}>
                      {ALERT_LABEL[r.alert]}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[220px]">
                    <p className="text-sm font-medium text-gray-900 truncate">{r.normalizedTitle}</p>
                    <p className="text-xs text-gray-400">{r.consecutiveYears}년 연속</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{r.agency}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{r.work_type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {r.years.map((y) => (
                        <span key={y} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                          {y}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-sm font-bold', TREND_COLOR[r.priceTrend])}>
                      {TREND_ICON[r.priceTrend]}
                    </span>
                    {r.priceChangeRate != null && (
                      <span className="text-xs text-gray-400 ml-1">
                        {r.priceChangeRate > 0 ? '+' : ''}{r.priceChangeRate}%/년
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 max-w-[120px] truncate">
                    {r.dominantWinner || '-'}
                  </td>
                  <td className="px-4 py-3">
                    {r.winnerChanged
                      ? <span className="text-xs text-green-600 font-medium">교체됨</span>
                      : <span className="text-xs text-orange-500">동일</span>}
                  </td>
                </tr>

                {expanded === r.key && (
                  <tr key={`${r.key}-detail`} className="bg-blue-50/30">
                    <td colSpan={8} className="px-4 py-4">
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-2 pr-4 text-gray-400 font-medium">연도</th>
                              <th className="text-left py-2 pr-4 text-gray-400 font-medium">사업명</th>
                              <th className="text-right py-2 pr-4 text-gray-400 font-medium">추정가격</th>
                              <th className="text-right py-2 pr-4 text-gray-400 font-medium">낙찰금액</th>
                              <th className="text-left py-2 pr-4 text-gray-400 font-medium">낙찰업체</th>
                              <th className="text-left py-2 pr-4 text-gray-400 font-medium">발주일</th>
                              <th className="text-left py-2 text-gray-400 font-medium">링크</th>
                            </tr>
                          </thead>
                          <tbody>
                            {r.bids.map((bid) => (
                              <tr key={bid.id} className="border-b border-gray-100">
                                <td className="py-2 pr-4 font-bold text-blue-700">{bid.year}</td>
                                <td className="py-2 pr-4 text-gray-700 max-w-[200px] truncate">{bid.title}</td>
                                <td className="py-2 pr-4 text-right text-gray-700">{formatPrice(bid.estimated_price)}</td>
                                <td className="py-2 pr-4 text-right text-gray-700">{formatPrice(bid.awarded_price)}</td>
                                <td className="py-2 pr-4 text-gray-700">{bid.winner || '-'}</td>
                                <td className="py-2 pr-4 text-gray-500">{formatDate(bid.announced_at)}</td>
                                <td className="py-2">
                                  {bid.url && (
                                    <a href={bid.url} target="_blank" rel="noopener noreferrer"
                                      className="text-blue-500 hover:underline" onClick={(e) => e.stopPropagation()}>
                                      공고↗
                                    </a>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    orange: 'bg-orange-50 text-orange-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
  };
  return (
    <div className={clsx('rounded-xl p-3 text-center', colorMap[color] || 'bg-gray-50 text-gray-700')}>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs mt-0.5 opacity-75">{label}</p>
    </div>
  );
}
