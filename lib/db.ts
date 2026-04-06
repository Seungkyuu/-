import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'g2b.db');

// data 디렉토리 보장
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    -- 사전규격공고
    CREATE TABLE IF NOT EXISTS pre_specs (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      agency      TEXT NOT NULL,
      dept        TEXT,
      work_type   TEXT NOT NULL,
      published_at DATE,
      budget      INTEGER,
      url         TEXT,
      bid_id      TEXT,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 입찰공고
    CREATE TABLE IF NOT EXISTS bids (
      id              TEXT PRIMARY KEY,
      title           TEXT NOT NULL,
      agency          TEXT NOT NULL,
      dept            TEXT,
      work_type       TEXT NOT NULL,
      announced_at    DATE,
      deadline_at     DATE,
      contract_at     DATE,
      estimated_price INTEGER,
      awarded_price   INTEGER,
      winner          TEXT,
      url             TEXT,
      pre_spec_id     TEXT,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 영업 메모
    CREATE TABLE IF NOT EXISTS sales_memos (
      bid_id      TEXT PRIMARY KEY,
      memo        TEXT,
      status      TEXT DEFAULT '관심',
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 인덱스
    CREATE INDEX IF NOT EXISTS idx_bids_announced ON bids(announced_at);
    CREATE INDEX IF NOT EXISTS idx_bids_agency ON bids(agency);
    CREATE INDEX IF NOT EXISTS idx_bids_work_type ON bids(work_type);
    CREATE INDEX IF NOT EXISTS idx_pre_specs_published ON pre_specs(published_at);
  `);
}

export { WORK_TYPES } from './constants';
export type { WorkType } from './constants';

export interface Bid {
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
  pre_spec_id: string | null;
}

export interface PreSpec {
  id: string;
  title: string;
  agency: string;
  dept: string | null;
  work_type: string;
  published_at: string | null;
  budget: number | null;
  url: string | null;
  bid_id: string | null;
}

export interface SalesMemo {
  bid_id: string;
  memo: string | null;
  status: string;
  updated_at: string;
}
