import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'G2B 사전영업 지원 시스템',
  description: '나라장터 2025년 발주 데이터 분석 및 2026년 사전 영업 일정 수립 대시보드',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</main>
      </body>
    </html>
  );
}
