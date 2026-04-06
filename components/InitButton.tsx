'use client';

import { useState } from 'react';

export default function InitButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleInit = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/init', { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        setResult(`오류: ${data.error}`);
      } else {
        setResult(data.message + (data.inserted ? ` (${data.inserted}건 삽입)` : ''));
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch {
      setResult('요청 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleInit}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {loading ? '초기화 중...' : '샘플 데이터 초기화'}
      </button>
      {result && <p className="text-sm text-gray-600">{result}</p>}
    </div>
  );
}
