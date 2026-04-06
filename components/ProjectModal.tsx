'use client';

import { useState, useEffect } from 'react';
import { formatDate, formatPriceKRW, formatPrice } from '@/lib/utils';
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

interface HistoryBid {
  id: string;
  year: number;
  title: string;
  announced_at: string;
  estimated_price: number | null;
  awarded_price: number | null;
  winner: string | null;
  url: string | null;
}

interface HistoryData {
  relatedCount: number;
  history: HistoryBid[];
  years: number[];
  priceTrend: string;
  annualChangeRate: number | null;
  winnerRanking: Array<{ winner: string; count: number }>;
  isRecurring: boolean;
}

interface Props {
  project: ProjectRow;
  onClose: () => void;
  onMemoSave: (bidId: string, memo: string, status: string) => Promise<void>;
}

const STATUS_OPTIONS = ['관심', '진행중', '완료', '패스'];
const STATUS_COLORS: Record<string, string> = {
  관심: 'bg-blue-100 text-blue-700',
  진행중: 'bg-yellow-100 text-yellow-700',
  완료: 'bg-green-100 text-green-700',
  패스: 'bg-gray-100 text-gray-500',
};

const TREND_STYLE: Record<string, string> = {
  상승: 'text-red-500',
  하락: 'text-blue-500',
  안정: 'text-green-500',
  '데이터 없음': 'text-gray-400',
};

type Tab = 'detail' | 'history' | 'memo';

export default function ProjectModal({ project, onClose, onMemoSave }: Props) {
  const [tab, setTab] = useState<Tab>('detail');
  const [memo, setMemo] = useState(project.memo || '');
  const [status, setStatus] = useState(project.memo_status || '관심');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (tab === 'history' && !history) {
      setHistoryLoading(true);
      fetch(`/api/projects/history?agency=${encodeURIComponent(project.agency)}&title=${encodeURIComponent(project.title)}`)
        .then((r) => r.json())
        .then(setHistory)
        .catch(() => setHistory(null))
        .finally(() => setHistoryLoading(false));
    }
  }, [tab, history, project.agency, project.title]);

  const handleSave = async () => {
    setSaving(true);
    await onMemoSave(project.id, memo, status);
    setSaving(false);
  };

  const workTypeColor =
    project.work_type === '기술용역' ? 'bg-purple-100 text-purple-700' :
    project.work_type === '일반용역' ? 'bg-blue-100 text-blue-700' :
    project.work_type === '민간' ? 'bg-orange-100 text-orange-700' :
    'bg-gray-100 text-gray-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* 헤더 */}
        <div className="border-b border-gray-100 px-6 py-4 flex items-start justify-between shrink-0">
          <div className="flex-1 pr-4">
            <span className={clsx('inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-2', workTypeColor)}>
              {project.work_type}
            </span>
            <h2 className="text-base font-bold text-gray-900 leading-snug">{project.title}</h2>
            <p className="text-xs text-gray-400 mt-1">{project.agency} {project.dept && `· ${project.dept}`}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none mt-1">×</button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-100 px-6 shrink-0">
          {([
            { key: 'detail', label: '상세 정보' },
            { key: 'history', label: '연도별 이력' },
            { key: 'memo', label: '영업 메모' },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                tab === t.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              )}
            >
              {t.label}
              {t.key === 'history' && history?.isRecurring && (
                <span className="ml-1.5 text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">연속</span>
              )}
            </button>
          ))}
        </div>

        {/* 본문 */}
        <div className="overflow-y-auto flex-1 p-6">
          {tab === 'detail' && (
            <div className="space-y-5">
              <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">일정</h3>
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="사전규격공고일" value={formatDate(project.pre_spec_published_at)} />
                  <InfoRow label="리드타임" value={project.lead_time != null ? `${project.lead_time}일` : '-'} />
                  <InfoRow label="입찰공고일" value={formatDate(project.announced_at)} />
                  <InfoRow label="입찰마감일" value={formatDate(project.deadline_at)} />
                  <InfoRow label="계약일" value={formatDate(project.contract_at)} />
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">금액</h3>
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="추정가격" value={formatPriceKRW(project.estimated_price)} />
                  <InfoRow label="낙찰금액" value={formatPriceKRW(project.awarded_price)} />
                  {project.estimated_price && project.awarded_price && (
                    <InfoRow
                      label="낙찰률"
                      value={`${Math.round(project.awarded_price / project.estimated_price * 100)}%`}
                    />
                  )}
                  <InfoRow label="낙찰업체" value={project.winner || '-'} />
                </div>
              </section>

              <section className="flex gap-3">
                {project.url && (
                  <a href={project.url} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline">
                    입찰공고 원문 →
                  </a>
                )}
                {project.pre_spec_url && (
                  <a href={project.pre_spec_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-purple-600 hover:underline">
                    사전규격 →
                  </a>
                )}
              </section>
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-4">
              {historyLoading ? (
                <div className="h-40 bg-gray-50 rounded-xl animate-pulse" />
              ) : !history ? (
                <p className="text-sm text-gray-400 text-center py-8">이력을 불러올 수 없습니다.</p>
              ) : (
                <>
                  {/* 연속사업 뱃지 */}
                  {history.isRecurring ? (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-bold text-orange-700">연속사업 감지됨</span>
                        <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                          {history.years.length}개년 ({history.years.join(', ')})
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-gray-400">가격 추세</span>
                          <span className={clsx('ml-2 font-semibold', TREND_STYLE[history.priceTrend])}>
                            {history.priceTrend}
                            {history.annualChangeRate != null && (
                              <span className="font-normal text-gray-400 ml-1">
                                ({history.annualChangeRate > 0 ? '+' : ''}{history.annualChangeRate}%/년)
                              </span>
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">주요 낙찰업체</span>
                          <span className="ml-2 font-semibold text-gray-700">
                            {history.winnerRanking[0]?.winner || '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-500">
                      단발성 사업으로 파악됩니다. (유사 사업 {history.relatedCount}건 확인)
                    </div>
                  )}

                  {/* 연도별 이력 테이블 */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 pr-3 text-xs text-gray-400 font-medium">연도</th>
                          <th className="text-right py-2 pr-3 text-xs text-gray-400 font-medium">추정가격</th>
                          <th className="text-right py-2 pr-3 text-xs text-gray-400 font-medium">낙찰금액</th>
                          <th className="text-left py-2 pr-3 text-xs text-gray-400 font-medium">낙찰업체</th>
                          <th className="text-left py-2 text-xs text-gray-400 font-medium">발주일</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.history.map((h, idx) => {
                          const prevBid = idx > 0 ? history.history[idx - 1] : null;
                          const priceChanged = prevBid?.estimated_price && h.estimated_price
                            ? h.estimated_price > prevBid.estimated_price
                            : null;
                          const winnerChanged = prevBid?.winner && h.winner && prevBid.winner !== h.winner;

                          return (
                            <tr key={h.id} className={clsx('border-b border-gray-50', h.id === project.id && 'bg-blue-50')}>
                              <td className="py-2 pr-3">
                                <span className={clsx('font-bold', h.id === project.id ? 'text-blue-700' : 'text-gray-700')}>
                                  {h.year}
                                  {h.id === project.id && <span className="text-xs font-normal text-blue-400 ml-1">현재</span>}
                                </span>
                              </td>
                              <td className="py-2 pr-3 text-right text-gray-700">
                                {formatPrice(h.estimated_price)}
                                {priceChanged != null && (
                                  <span className={priceChanged ? 'text-red-400 ml-1' : 'text-blue-400 ml-1'}>
                                    {priceChanged ? '↑' : '↓'}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 pr-3 text-right text-gray-600">{formatPrice(h.awarded_price)}</td>
                              <td className="py-2 pr-3 text-gray-700">
                                {h.winner || '-'}
                                {winnerChanged && (
                                  <span className="ml-1 text-xs text-green-500">(교체)</span>
                                )}
                              </td>
                              <td className="py-2 text-gray-400 text-xs">{formatDate(h.announced_at)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* 낙찰업체 순위 */}
                  {history.winnerRanking.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-2">낙찰업체 수주 현황</p>
                      <div className="flex gap-2 flex-wrap">
                        {history.winnerRanking.map(({ winner, count }) => (
                          <div key={winner} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                            <span className="text-sm text-gray-700">{winner}</span>
                            <span className="text-xs text-blue-600 font-medium">{count}회</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === 'memo' && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-400 mb-2">영업 상태</p>
                <div className="flex gap-2">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={clsx(
                        'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                        status === s ? STATUS_COLORS[s] + ' border-current' : 'border-gray-200 text-gray-400'
                      )}
                    >{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-2">메모</p>
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="영업 메모를 입력하세요..."
                  rows={6}
                  className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {saving ? '저장 중...' : '메모 저장'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 font-medium">{value}</p>
    </div>
  );
}
