'use client';

import clsx from 'clsx';

interface HeatmapData {
  month: number;
  work_type: string;
  count: number;
  total: number;
}

interface Props {
  data: HeatmapData[];
  workTypes: string[];
}

const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

function getIntensity(count: number, maxCount: number): number {
  if (maxCount === 0 || count === 0) return 0;
  return count / maxCount;
}

function intensityToColor(intensity: number): string {
  if (intensity === 0) return 'bg-gray-50 text-gray-300';
  if (intensity < 0.25) return 'bg-blue-100 text-blue-600';
  if (intensity < 0.5) return 'bg-blue-200 text-blue-700';
  if (intensity < 0.75) return 'bg-blue-400 text-white';
  return 'bg-blue-600 text-white';
}

export default function HeatmapChart({ data, workTypes }: Props) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const getCellData = (wt: string, month: number) =>
    data.find((d) => d.work_type === wt && d.month === month);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left text-xs text-gray-400 font-medium py-2 pr-4 min-w-[90px]">
              업무구분
            </th>
            {MONTHS.map((m) => (
              <th key={m} className="text-center text-xs text-gray-400 font-medium py-2 min-w-[52px]">
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {workTypes.map((wt) => (
            <tr key={wt} className="border-t border-gray-50">
              <td className="text-xs font-medium text-gray-600 py-2 pr-4">{wt}</td>
              {MONTHS.map((_, idx) => {
                const month = idx + 1;
                const cell = getCellData(wt, month);
                const intensity = getIntensity(cell?.count || 0, maxCount);
                return (
                  <td key={month} className="py-1 px-1">
                    <div
                      className={clsx(
                        'rounded-md text-center text-xs font-medium py-2 transition-transform hover:scale-110 cursor-default',
                        intensityToColor(intensity)
                      )}
                      title={`${wt} ${month}월: ${cell?.count || 0}건 / ${
                        cell ? Math.round(cell.total / 100_000_000) : 0
                      }억원`}
                    >
                      {cell?.count || 0}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
