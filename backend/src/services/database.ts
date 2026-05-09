import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../../data');
const dbPath = path.join(dataDir, 'signals.db');

mkdirSync(dataDir, { recursive: true });

let db: SqlJsDatabase | null = null;

async function initDb() {
  const SQL = await initSqlJs();

  if (existsSync(dbPath)) {
    const buffer = readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS signals (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      type TEXT NOT NULL,
      entry_price REAL NOT NULL,
      stop_loss REAL NOT NULL,
      take_profit REAL NOT NULL,
      confidence REAL NOT NULL,
      timeframe TEXT NOT NULL,
      reason TEXT,
      rsi REAL,
      macd_value REAL,
      macd_signal REAL,
      macd_histogram REAL,
      ema_fast REAL,
      ema_slow REAL,
      ema_signal REAL,
      bollinger_upper REAL,
      bollinger_middle REAL,
      bollinger_lower REAL,
      atr REAL,
      status TEXT DEFAULT 'open',
      closed_at INTEGER,
      closed_price REAL,
      pnl_pct REAL,
      created_at INTEGER
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_symbol ON signals(symbol)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_timestamp ON signals(timestamp)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_status ON signals(status)`);

  saveDb();
}

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(dbPath, buffer);
  }
}

export interface SignalRecord {
  id: string;
  timestamp: number;
  symbol: string;
  type: 'long' | 'short';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  timeframe: string;
  reason: string;
  rsi: number;
  macdValue: number;
  macdSignal: number;
  macdHistogram: number;
  emaFast: number;
  emaSlow: number;
  emaSignal: number;
  bollingerUpper: number;
  bollingerMiddle: number;
  bollingerLower: number;
  atr: number;
  status: 'open' | 'won' | 'lost' | 'cancelled';
  closedAt?: number;
  closedPrice?: number;
  pnlPct?: number;
}

export interface SignalStats {
  total: number;
  won: number;
  lost: number;
  winRate: number;
  avgConfidence: number;
  byTimeframe: { timeframe: string; total: number; won: number; winRate: number }[];
  bySymbol: { symbol: string; total: number; won: number; winRate: number }[];
  byType: { type: string; total: number; won: number; winRate: number }[];
  pnlByTimeframe: { timeframe: string; avg: number; total: number }[];
}

export const signalDb = {
  initialized: false,

  async init() {
    await initDb();
    this.initialized = true;
    console.log(`[DB] SQLite database at ${dbPath}`);
  },

  save(signal: SignalRecord) {
    if (!db) return;
    
    db.run(`
      INSERT OR REPLACE INTO signals VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', NULL, NULL, NULL)
    `, [
      signal.id, signal.timestamp, signal.symbol, signal.type,
      signal.entryPrice, signal.stopLoss, signal.takeProfit, signal.confidence,
      signal.timeframe, signal.reason, signal.rsi, signal.macdValue,
      signal.macdSignal, signal.macdHistogram, signal.emaFast, signal.emaSlow,
      signal.emaSignal, signal.bollingerUpper, signal.bollingerMiddle,
      signal.bollingerLower, signal.atr
    ]);
    saveDb();
  },

  getAll(limit = 100): SignalRecord[] {
    if (!db) return [];
    const results = db.exec(`SELECT * FROM signals ORDER BY timestamp DESC LIMIT ${limit}`);
    return this.parseResults(results);
  },

  getBySymbol(symbol: string, limit = 50): SignalRecord[] {
    if (!db) return [];
    const results = db.exec(`SELECT * FROM signals WHERE symbol LIKE '%${symbol}%' ORDER BY timestamp DESC LIMIT ${limit}`);
    return this.parseResults(results);
  },

  getOpen(): SignalRecord[] {
    if (!db) return [];
    const results = db.exec(`SELECT * FROM signals WHERE status = 'open' ORDER BY timestamp DESC`);
    return this.parseResults(results);
  },

  updateStatus(id: string, status: string, closedPrice: number, pnlPct: number) {
    if (!db) return;
    db.run(`UPDATE signals SET status = ?, closed_at = ?, closed_price = ?, pnl_pct = ? WHERE id = ?`,
      [status, Date.now(), closedPrice, pnlPct, id]);
    saveDb();
  },

  getStats(): SignalStats {
    if (!db) return { total: 0, won: 0, lost: 0, winRate: 0, avgConfidence: 0, byTimeframe: [], bySymbol: [], byType: [], pnlByTimeframe: [] };

    const total = (db.exec(`SELECT COUNT(*) FROM signals`)[0]?.values[0]?.[0] as number) || 0;
    const won = (db.exec(`SELECT COUNT(*) FROM signals WHERE status = 'won'`)[0]?.values[0]?.[0] as number) || 0;
    const lost = (db.exec(`SELECT COUNT(*) FROM signals WHERE status = 'lost'`)[0]?.values[0]?.[0] as number) || 0;
    const avgConf = (db.exec(`SELECT AVG(confidence) FROM signals`)[0]?.values[0]?.[0] as number) || 0;

    const byTfRaw = db.exec(`SELECT timeframe, COUNT(*) as total, SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won FROM signals GROUP BY timeframe`);
    const byTimeframe = this.parseSimpleResults(byTfRaw).map((r: any) => ({
      timeframe: r.timeframe,
      total: r.total,
      won: r.won,
      winRate: r.total > 0 ? (r.won / r.total) * 100 : 0
    }));

    const bySymRaw = db.exec(`SELECT symbol, COUNT(*) as total, SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won FROM signals GROUP BY symbol ORDER BY total DESC LIMIT 10`);
    const bySymbol = this.parseSimpleResults(bySymRaw).map((r: any) => ({
      symbol: r.symbol,
      total: r.total,
      won: r.won,
      winRate: r.total > 0 ? (r.won / r.total) * 100 : 0
    }));

    const byTypeRaw = db.exec(`SELECT type, COUNT(*) as total, SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won FROM signals GROUP BY type`);
    const byType = this.parseSimpleResults(byTypeRaw).map((r: any) => ({
      type: r.type,
      total: r.total,
      won: r.won,
      winRate: r.total > 0 ? (r.won / r.total) * 100 : 0
    }));

    const pnlRaw = db.exec(`SELECT timeframe, AVG(pnl_pct) as avg, SUM(pnl_pct) as total FROM signals WHERE pnl_pct IS NOT NULL GROUP BY timeframe`);
    const pnlByTimeframe = this.parseSimpleResults(pnlRaw).map((r: any) => ({
      timeframe: r.timeframe,
      avg: r.avg || 0,
      total: r.total || 0
    }));

    return {
      total, won, lost,
      winRate: total > 0 ? (won / total) * 100 : 0,
      avgConfidence: avgConf,
      byTimeframe,
      bySymbol,
      byType,
      pnlByTimeframe
    };
  },

  parseResults(results: any[]): SignalRecord[] {
    if (!results.length || !results[0].values.length) return [];
    
    const cols = results[0].columns;
    return results[0].values.map((row: any) => {
      const obj: any = {};
      cols.forEach((col: string, i: number) => {
        const camelCol = col.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
        obj[camelCol] = row[i];
      });
      return obj as SignalRecord;
    });
  },

  parseSimpleResults(results: any[]): any[] {
    if (!results.length || !results[0].values.length) return [];
    const cols = results[0].columns;
    return results[0].values.map((row: any) => {
      const obj: any = {};
      cols.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return obj;
    });
  }
};