'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const navItems = [
  { href: '/', label: '대시보드' },
  { href: '/projects', label: '사업 목록' },
  { href: '/analytics', label: '발주 패턴 분석' },
  { href: '/calendar', label: '영업 캘린더' },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-blue-600 font-bold text-xl">G2B</span>
              <span className="text-gray-700 font-semibold text-sm hidden sm:block">
                사전영업 지원 시스템
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    pathname === item.href
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 hidden sm:block">2025년 데이터 기준</span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
              영업팀 전용
            </span>
          </div>
        </div>

        {/* 모바일 메뉴 */}
        <div className="md:hidden border-t border-gray-100 py-2 flex gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
                pathname === item.href
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
