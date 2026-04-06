import { format, parseISO, differenceInDays } from 'date-fns';
import { ko } from 'date-fns/locale';

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    return format(parseISO(dateStr), 'yyyy.MM.dd', { locale: ko });
  } catch {
    return dateStr;
  }
}

export function formatMonth(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    return format(parseISO(dateStr), 'yyyy년 M월', { locale: ko });
  } catch {
    return dateStr;
  }
}

export function formatPrice(amount: number | null | undefined): string {
  if (amount == null) return '-';
  if (amount >= 100_000_000) {
    return `${(amount / 100_000_000).toFixed(1)}억`;
  }
  if (amount >= 10_000) {
    return `${(amount / 10_000).toFixed(0)}만`;
  }
  return amount.toLocaleString('ko-KR') + '원';
}

export function formatPriceKRW(amount: number | null | undefined): string {
  if (amount == null) return '-';
  return amount.toLocaleString('ko-KR') + '원';
}

export function calcLeadTime(
  announcedAt: string | null,
  publishedAt: string | null
): number | null {
  if (!announcedAt || !publishedAt) return null;
  try {
    return differenceInDays(parseISO(announcedAt), parseISO(publishedAt));
  } catch {
    return null;
  }
}

export function getMonthFromDate(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  try {
    return parseISO(dateStr).getMonth() + 1;
  } catch {
    return null;
  }
}

export function addDays(dateStr: string, days: number): string {
  const d = parseISO(dateStr);
  d.setDate(d.getDate() + days);
  return format(d, 'yyyy-MM-dd');
}

export function today(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  try {
    return differenceInDays(parseISO(dateStr), new Date());
  } catch {
    return null;
  }
}
