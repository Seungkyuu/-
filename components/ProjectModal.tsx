'use client';

import { useState } from 'react';
import { formatDate, formatPriceKRW } from '@/lib/utils';

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

export default function ProjectModal({ project, onClose, onMemoSave }: Props) {
  const [memo, setMemo] = useState(project.memo || '');
  const [status, setStatus] = useState(project.memo_status || '관심');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onMemoSave(project.id, memo, status);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-start justify-between rounded-t-2xl">
          <div className="flex-1 pr-4">
            <span
              className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-2 ${
                project.work_type === '기술용역'
                  ? 'bg-purple-100 text-purple-700'
                  : project.work_type === '일반용역'
                  ? 'bg-blue-100 text-blue-700'
                  : project.work_type === '민간'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {project.work_type}
            </span>
            <h2 className="text-lg font-bold text-gray-900 leading-snug">{project.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none mt-1"
          >
            ×
          </button>
        </div>

        {/* 본문 */}
        <div className="p-6 space-y-5">
          {/* 기관 정보 */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">발주기관</h3>
            <div className="grid grid-cols-2 gap-3">
              <InfoRow label="기관명" value={project.agency} />
              <InfoRow label="부서명" value={project.dept || '-'} />
            </div>
          </section>

          {/* 일정 */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">일정</h3>
            <div className="grid grid-cols-2 gap-3">
              <InfoRow label="사전규격공고일" value={formatDate(project.pre_spec_published_at)} />
              <InfoRow
                label="리드타임"
                value={project.lead_time != null ? `${project.lead_time}일` : '-'}
              />
              <InfoRow label="입찰공고일" value={formatDate(project.announced_at)} />
              <InfoRow label="입찰마감일" value={formatDate(project.deadline_at)} />
              <InfoRow label="계약일" value={formatDate(project.contract_at)} />
            </div>
          </section>

          {/* 금액 */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">금액</h3>
            <div className="grid grid-cols-2 gap-3">
              <InfoRow label="추정가격" value={formatPriceKRW(project.estimated_price)} />
              <InfoRow label="낙찰금액" value={formatPriceKRW(project.awarded_price)} />
              <InfoRow label="낙찰업체" value={project.winner || '-'} />
            </div>
          </section>

          {/* 링크 */}
          <section className="flex gap-3">
            {project.url && (
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
              >
                입찰공고 원문 보기 →
              </a>
            )}
            {project.pre_spec_url && (
              <a
                href={project.pre_spec_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-purple-600 hover:underline"
              >
                사전규격 보기 →
              </a>
            )}
          </section>

          {/* 영업 메모 */}
          <section className="border-t border-gray-100 pt-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">영업 메모</h3>
            <div className="flex gap-2 mb-3">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    status === s
                      ? STATUS_COLORS[s] + ' border-current'
                      : 'border-gray-200 text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="영업 메모를 입력하세요..."
              rows={4}
              className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-2 w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {saving ? '저장 중...' : '메모 저장'}
            </button>
          </section>
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
