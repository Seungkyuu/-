/**
 * 데이터 수집 검증 모듈
 * 수집/삽입 후 데이터 품질을 검증합니다.
 */

import type Database from 'better-sqlite3';
import { WORK_TYPES } from './constants';

export interface ValidationCheck {
  stage: string;
  description: string;
  expected: string | number;
  actual: string | number;
  passed: boolean;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationReport {
  year: number;
  runAt: string;
  totalChecks: number;
  passedChecks: number;
  failedErrors: number;
  failedWarnings: number;
  checks: ValidationCheck[];
  summary: 'pass' | 'warn' | 'fail';
}

export function validateDatabase(db: Database.Database, year: number): ValidationReport {
  const checks: ValidationCheck[] = [];
  const yearStr = String(year);

  // ── 1. 기본 건수 검증 ──
  const bidCount = (db.prepare(
    `SELECT COUNT(*) as c FROM bids WHERE announced_at LIKE '${yearStr}%'`
  ).get() as { c: number }).c;

  checks.push({
    stage: '입찰공고 건수',
    description: `${year}년 입찰공고 데이터 존재 여부`,
    expected: '1건 이상',
    actual: `${bidCount}건`,
    passed: bidCount > 0,
    severity: 'error',
  });

  const preSpecCount = (db.prepare(
    `SELECT COUNT(*) as c FROM pre_specs WHERE published_at LIKE '${yearStr}%'`
  ).get() as { c: number }).c;

  checks.push({
    stage: '사전규격 건수',
    description: `${year}년 사전규격공고 데이터 존재 여부`,
    expected: '1건 이상',
    actual: `${preSpecCount}건`,
    passed: preSpecCount > 0,
    severity: 'warning',
  });

  // ── 2. 업무구분 분포 ──
  for (const wt of WORK_TYPES) {
    const wtCount = (db.prepare(
      `SELECT COUNT(*) as c FROM bids WHERE work_type = ? AND announced_at LIKE '${yearStr}%'`
    ).get(wt) as { c: number }).c;

    checks.push({
      stage: `업무구분 [${wt}]`,
      description: `${year}년 ${wt} 분류 데이터 존재`,
      expected: '1건 이상',
      actual: `${wtCount}건`,
      passed: wtCount > 0,
      severity: 'warning',
    });
  }

  // ── 3. 필수 필드 NULL 검증 ──
  const nullTitles = (db.prepare(
    `SELECT COUNT(*) as c FROM bids WHERE (title IS NULL OR title = '') AND announced_at LIKE '${yearStr}%'`
  ).get() as { c: number }).c;

  checks.push({
    stage: '사업명 누락',
    description: '사업명(title) NULL/공백 레코드',
    expected: '0건',
    actual: `${nullTitles}건`,
    passed: nullTitles === 0,
    severity: 'error',
  });

  const nullAgency = (db.prepare(
    `SELECT COUNT(*) as c FROM bids WHERE (agency IS NULL OR agency = '') AND announced_at LIKE '${yearStr}%'`
  ).get() as { c: number }).c;

  checks.push({
    stage: '발주기관 누락',
    description: '발주기관(agency) NULL/공백 레코드',
    expected: '0건',
    actual: `${nullAgency}건`,
    passed: nullAgency === 0,
    severity: 'error',
  });

  // ── 4. 날짜 정합성 ──
  const invalidDates = (db.prepare(
    `SELECT COUNT(*) as c FROM bids
     WHERE announced_at IS NOT NULL AND deadline_at IS NOT NULL
       AND deadline_at < announced_at
       AND announced_at LIKE '${yearStr}%'`
  ).get() as { c: number }).c;

  checks.push({
    stage: '날짜 정합성',
    description: '마감일이 공고일보다 이른 레코드',
    expected: '0건',
    actual: `${invalidDates}건`,
    passed: invalidDates === 0,
    severity: 'warning',
  });

  // ── 5. 금액 이상치 ──
  const negativePrice = (db.prepare(
    `SELECT COUNT(*) as c FROM bids WHERE estimated_price < 0 AND announced_at LIKE '${yearStr}%'`
  ).get() as { c: number }).c;

  checks.push({
    stage: '금액 이상치',
    description: '추정가격 음수 레코드',
    expected: '0건',
    actual: `${negativePrice}건`,
    passed: negativePrice === 0,
    severity: 'error',
  });

  // ── 6. 낙찰금액 vs 추정가격 비율 ──
  const overAwarded = (db.prepare(
    `SELECT COUNT(*) as c FROM bids
     WHERE awarded_price IS NOT NULL AND estimated_price IS NOT NULL
       AND awarded_price > estimated_price * 1.1
       AND announced_at LIKE '${yearStr}%'`
  ).get() as { c: number }).c;

  checks.push({
    stage: '낙찰금액 초과',
    description: '낙찰금액이 추정가격의 110% 초과 레코드',
    expected: '0건',
    actual: `${overAwarded}건`,
    passed: overAwarded === 0,
    severity: 'warning',
  });

  // ── 7. 월별 분포 균형 ──
  const monthDist = db.prepare(
    `SELECT CAST(strftime('%m', announced_at) AS INTEGER) as m, COUNT(*) as c
     FROM bids WHERE announced_at LIKE '${yearStr}%' GROUP BY m`
  ).all() as Array<{ m: number; c: number }>;

  const monthsWithData = monthDist.length;
  checks.push({
    stage: '월별 분포',
    description: '데이터가 있는 월 수',
    expected: '6개월 이상',
    actual: `${monthsWithData}개월`,
    passed: monthsWithData >= 6,
    severity: 'info',
  });

  // ── 리포트 집계 ──
  const passedChecks = checks.filter((c) => c.passed).length;
  const failedErrors = checks.filter((c) => !c.passed && c.severity === 'error').length;
  const failedWarnings = checks.filter((c) => !c.passed && c.severity === 'warning').length;

  let summary: ValidationReport['summary'] = 'pass';
  if (failedErrors > 0) summary = 'fail';
  else if (failedWarnings > 0) summary = 'warn';

  return {
    year,
    runAt: new Date().toISOString(),
    totalChecks: checks.length,
    passedChecks,
    failedErrors,
    failedWarnings,
    checks,
    summary,
  };
}
