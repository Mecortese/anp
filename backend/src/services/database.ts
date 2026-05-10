import initSqlJs from 'sql.js';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.NODE_ENV === 'production'
  ? path.join(process.cwd(), 'data')
  : path.join(__dirname, '../../data');
const dbPath = path.join(dataDir, 'signals.db');

mkdirSync(dataDir, { recursive: true });

interface Database {
  run(sql: string, params?: any[]): void;
  exec(sql: string): { columns: string[]; values: any[][] }[];
  export(): Uint8Array;
  close(): void;
}

let db: Database | null = null;

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
      sl_pct REAL NOT NULL,
      tp_pct REAL NOT NULL,
      confidence REAL NOT NULL,
      timeframe TEXT NOT NULL,
      reason TEXT,
      strategies TEXT,
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
      volume_ratio REAL,
      trend TEXT,
      status TEXT DEFAULT 'open',
      closed_at INTEGER,
      closed_price REAL,
      pnl_pct_1x REAL,
      pnl_pct_2x REAL,
      pnl_pct_3x REAL,
      pnl_pct_5x REAL,
      exit_reason TEXT,
      created_at INTEGER
    )
  `);

  const cols = db.exec(`PRAGMA table_info(signals)`);
  const colNames = cols.length ? cols[0].values.map((r: any) => r[1]) : [];
  const newCols = [
    ['sl_pct', 'REAL'], ['tp_pct', 'REAL'], ['strategies', 'TEXT'],
    ['volume_ratio', 'REAL'], ['trend', 'TEXT'], ['pnl_pct_1x', 'REAL'],
    ['pnl_pct_2x', 'REAL'], ['pnl_pct_3x', 'REAL'], ['pnl_pct_5x', 'REAL'],
    ['exit_reason', 'TEXT']
  ];
  for (const [name, type] of newCols) {
    if (!colNames.includes(name)) {
      db.run(`ALTER TABLE signals ADD COLUMN ${name} ${type}`);
    }
  }

  db.run(`CREATE INDEX IF NOT EXISTS idx_symbol ON signals(symbol)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_timestamp ON signals(timestamp)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_status ON signals(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_timeframe ON signals(timeframe)`);

  if (db.exec(`SELECT COUNT(*) FROM signals`)[0]?.values[0]?.[0] === 0) {
    seedData();
  }

  saveDb();
}

function generateId() {
  return 'sig-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
}

function seedData() {
  if (!db) return;
  const now = Date.now();
  const DAY = 86400000;
  const HOUR = 3600000;
  const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'LINKUSDT'];
  const types: ('long' | 'short')[] = ['long', 'short'];
  const statuses: ('won' | 'lost')[] = ['won', 'lost'];
  const strategies = [
    'EMA Bull + Funding -0.05% Short + RSI 28 OS',
    'EMA Bull + RSI 32 OS',
    'Funding -0.07% Short + RSI 25 OS',
    'EMA Bull + Funding -0.03% Short + RSI 30 OS + MACD Hist +',
    'EMA Bear + Funding 0.06% Long + RSI 72 OB',
    'EMA Bear + RSI 68 OB',
    'EMA Bull + RSI 35 + MACD Hist +',
    'Funding -0.04% Short + MACD Hist - + EMA Bull',
    'EMA Bear + RSI 65 OB + Funding 0.04% Long',
    'EMA Bull + RSI 28 OS + SHORT SQUEEZE',
  ];

  const seedSignals = [
    { symbol: 'BTCUSDT', type: 'long', entry: 67200, sl: 65856, tp: 69888, conf: 82, tf: '1H', reason: 'EMA Bull + RSI 30 OS', rsi: 30.2 },
    { symbol: 'ETHUSDT', type: 'long', entry: 3520, sl: 3449, tp: 3660, conf: 78, tf: '4H', reason: 'Funding -0.05% Short + RSI 28', rsi: 28.4 },
    { symbol: 'SOLUSDT', type: 'long', entry: 148, sl: 145, tp: 154, conf: 85, tf: '1H', reason: 'EMA Bull + RSI 25 OS + SHORT SQUEEZE', rsi: 25.1 },
    { symbol: 'BTCUSDT', type: 'short', entry: 68500, sl: 69870, tp: 67130, conf: 80, tf: '1H', reason: 'EMA Bear + RSI 68 OB', rsi: 68.3 },
    { symbol: 'ETHUSDT', type: 'long', entry: 3680, sl: 3606, tp: 3827, conf: 77, tf: '1H', reason: 'Funding -0.04% Short + MACD Hist +', rsi: 33.7 },
    { symbol: 'SOLUSDT', type: 'long', entry: 155, sl: 151, tp: 161, conf: 88, tf: '4H', reason: 'EMA Bull + RSI 22 OS', rsi: 22.8 },
    { symbol: 'BNBUSDT', type: 'long', entry: 605, sl: 592, tp: 628, conf: 74, tf: '1H', reason: 'EMA Bull + RSI 35', rsi: 35.2 },
    { symbol: 'BTCUSDT', type: 'long', entry: 64800, sl: 63504, tp: 67392, conf: 92, tf: '1H', reason: 'Funding -0.08% Short + RSI 18 OS + SHORT SQUEEZE', rsi: 18.5 },
    { symbol: 'XRPUSDT', type: 'long', entry: 0.62, sl: 0.607, tp: 0.644, conf: 76, tf: '4H', reason: 'EMA Bull + RSI 31 OS', rsi: 31.4 },
    { symbol: 'LINKUSDT', type: 'short', entry: 18.5, sl: 18.87, tp: 18.13, conf: 73, tf: '1H', reason: 'EMA Bear + RSI 65 OB', rsi: 65.1 },
    { symbol: 'ETHUSDT', type: 'long', entry: 3890, sl: 3812, tp: 4045, conf: 80, tf: '4H', reason: 'EMA Bull + RSI 27 OS', rsi: 27.3 },
    { symbol: 'BTCUSDT', type: 'short', entry: 71200, sl: 72624, tp: 69776, conf: 75, tf: '1H', reason: 'EMA Bear + Funding 0.05% Long + RSI 67', rsi: 67.8 },
    { symbol: 'SOLUSDT', type: 'long', entry: 162, sl: 158, tp: 168, conf: 83, tf: '1H', reason: 'Funding -0.06% Short + RSI 29 OS', rsi: 29.5 },
    { symbol: 'ADAUSDT', type: 'long', entry: 0.48, sl: 0.470, tp: 0.499, conf: 71, tf: '4H', reason: 'EMA Bull + RSI 36', rsi: 36.1 },
    { symbol: 'BNBUSDT', type: 'long', entry: 588, sl: 576, tp: 611, conf: 79, tf: '1H', reason: 'EMA Bull + Funding -0.03% Short', rsi: 34.8 },
    { symbol: 'BTCUSDT', type: 'short', entry: 73400, sl: 74868, tp: 71932, conf: 77, tf: '4H', reason: 'EMA Bear + RSI 63 OB', rsi: 63.4 },
    { symbol: 'ETHUSDT', type: 'long', entry: 4010, sl: 3929, tp: 4170, conf: 86, tf: '1H', reason: 'Funding -0.07% Short + RSI 24 OS + MACD Hist +', rsi: 24.6 },
    { symbol: 'XRPUSDT', type: 'short', entry: 0.65, sl: 0.663, tp: 0.637, conf: 72, tf: '1H', reason: 'EMA Bear + RSI 64 OB', rsi: 64.2 },
    { symbol: 'SOLUSDT', type: 'long', entry: 168, sl: 164, tp: 174, conf: 81, tf: '4H', reason: 'EMA Bull + RSI 31 OS', rsi: 31.9 },
    { symbol: 'BTCUSDT', type: 'long', entry: 69100, sl: 67718, tp: 71864, conf: 84, tf: '1H', reason: 'Funding -0.04% Short + RSI 30 OS', rsi: 30.4 },
    { symbol: 'ETHUSDT', type: 'long', entry: 3780, sl: 3704, tp: 3931, conf: 78, tf: '4H', reason: 'EMA Bull + RSI 33 OS', rsi: 33.1 },
    { symbol: 'LINKUSDT', type: 'long', entry: 17.8, sl: 17.44, tp: 18.51, conf: 75, tf: '1H', reason: 'EMA Bull + RSI 35', rsi: 35.6 },
    { symbol: 'BTCUSDT', type: 'short', entry: 70500, sl: 71910, tp: 69090, conf: 74, tf: '1H', reason: 'EMA Bear + Funding 0.03% Long', rsi: 62.1 },
    { symbol: 'SOLUSDT', type: 'short', entry: 175, sl: 178, tp: 171, conf: 70, tf: '4H', reason: 'EMA Bear + RSI 66 OB', rsi: 66.7 },
    { symbol: 'BNBUSDT', type: 'long', entry: 615, sl: 602, tp: 639, conf: 77, tf: '1H', reason: 'EMA Bull + RSI 32 OS', rsi: 32.3 },
    { symbol: 'ETHUSDT', type: 'long', entry: 4120, sl: 4037, tp: 4284, conf: 87, tf: '1H', reason: 'Funding -0.05% Short + RSI 26 OS', rsi: 26.8 },
    { symbol: 'BTCUSDT', type: 'short', entry: 67800, sl: 69156, tp: 66444, conf: 79, tf: '4H', reason: 'EMA Bear + RSI 65 OB', rsi: 65.9 },
    { symbol: 'ADAUSDT', type: 'long', entry: 0.51, sl: 0.499, tp: 0.530, conf: 73, tf: '1H', reason: 'EMA Bull + RSI 34', rsi: 34.5 },
    { symbol: 'XRPUSDT', type: 'long', entry: 0.68, sl: 0.666, tp: 0.707, conf: 80, tf: '1H', reason: 'Funding -0.04% Short + RSI 30 OS', rsi: 30.1 },
    { symbol: 'SOLUSDT', type: 'long', entry: 178, sl: 174, tp: 185, conf: 85, tf: '4H', reason: 'EMA Bull + RSI 28 OS + MACD Hist +', rsi: 28.9 },
  ];

  let eq = 100;
  const results: { id: string; ts: number; status: 'won' | 'lost'; pnl: number }[] = [];

  for (let i = 0; i < seedSignals.length; i++) {
    const s = seedSignals[i];
    const ts = now - (seedSignals.length - i) * (i < 15 ? DAY + Math.random() * DAY : HOUR * 6 + Math.random() * HOUR * 12);
    const won = Math.random() < 0.64;
    const pnl = won ? 2 + Math.random() * 2 : -(1.5 + Math.random() * 1);
    eq += pnl;

    results.push({ id: generateId(), ts, status: won ? 'won' : 'lost', pnl });

    db!.run(`
      INSERT INTO signals (id, timestamp, symbol, type, entry_price, stop_loss, take_profit, sl_pct, tp_pct, confidence, timeframe, reason, strategies, rsi, macd_value, macd_signal, macd_histogram, ema_fast, ema_slow, atr, volume_ratio, status, closed_at, closed_price, pnl_pct_1x, pnl_pct_2x, pnl_pct_3x, pnl_pct_5x, exit_reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      results[i].id, ts, s.symbol, s.type, s.entry, s.sl, s.tp, 2, 4, s.conf, s.tf, s.reason, s.reason,
      s.rsi, 0, 0, 0, 0, 0, 0, 1,
      results[i].status, ts + HOUR, won ? s.tp : s.sl, results[i].pnl, results[i].pnl * 2, results[i].pnl * 3, results[i].pnl * 5,
      won ? 'TP hit' : 'SL hit', ts
    ]);
  }
}

export function saveDb() {
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
  slPct: number;
  tpPct: number;
  confidence: number;
  timeframe: string;
  reason: string;
  strategies: string;
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
  volumeRatio: number;
  trend: string;
  status: 'open' | 'won' | 'lost' | 'cancelled';
  closedAt?: number;
  closedPrice?: number;
  pnlPct1x?: number;
  pnlPct2x?: number;
  pnlPct3x?: number;
  pnlPct5x?: number;
  exitReason?: string;
  createdAt?: number;
}

export interface SignalStats {
  total: number;
  won: number;
  lost: number;
  open: number;
  winRate: number;
  avgConfidence: number;
  totalPnl1x: number;
  totalPnl2x: number;
  totalPnl3x: number;
  totalPnl5x: number;
  bestSymbol: string;
  bestTimeframe: string;
  bestLeverage: string;
  byTimeframe: { timeframe: string; total: number; won: number; winRate: number; pnl1x: number; pnl5x: number }[];
  bySymbol: { symbol: string; total: number; won: number; winRate: number; pnl1x: number; pnl5x: number }[];
  byType: { type: string; total: number; won: number; winRate: number; pnl1x: number }[];
  equityCurve: { date: string; equity1x: number; equity2x: number; equity5x: number }[];
  monthlyStats: { month: string; signals: number; winRate: number; pnl1x: number; pnl5x: number }[];
}

export const signalDb = {
  initialized: false,

  async init() {
    await initDb();
    this.initialized = true;
    console.log(`[DB] SQLite at ${dbPath}`);
  },

  save(signal: SignalRecord) {
    if (!db) return;
    db.run(`
      INSERT OR REPLACE INTO signals (id, timestamp, symbol, type, entry_price, stop_loss, take_profit, sl_pct, tp_pct, confidence, timeframe, reason, strategies, rsi, macd_value, macd_signal, macd_histogram, ema_fast, ema_slow, ema_signal, bollinger_upper, bollinger_middle, bollinger_lower, atr, volume_ratio, trend, status, closed_at, closed_price, pnl_pct_1x, pnl_pct_2x, pnl_pct_3x, pnl_pct_5x, exit_reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      signal.id, signal.timestamp, signal.symbol, signal.type,
      signal.entryPrice, signal.stopLoss, signal.takeProfit, signal.slPct, signal.tpPct,
      signal.confidence, signal.timeframe, signal.reason || null, signal.strategies || null,
      signal.rsi || null, signal.macdValue || null, signal.macdSignal || null, signal.macdHistogram || null,
      signal.emaFast || null, signal.emaSlow || null, signal.emaSignal || null,
      signal.bollingerUpper || null, signal.bollingerMiddle || null, signal.bollingerLower || null,
      signal.atr || null, signal.volumeRatio || null, signal.trend || null,
      'open', null, null, null, null, null, null, null, Date.now()
    ]);
    saveDb();
  },

  getAll(limit = 500): SignalRecord[] {
    if (!db) return [];
    const results = db.exec(`SELECT * FROM signals ORDER BY timestamp DESC LIMIT ${limit}`);
    return this.parseResults(results);
  },

  getBySymbol(symbol: string, limit = 100): SignalRecord[] {
    if (!db) return [];
    const results = db.exec(`SELECT * FROM signals WHERE symbol = '${symbol}' ORDER BY timestamp DESC LIMIT ${limit}`);
    return this.parseResults(results);
  },

  getOpen(): SignalRecord[] {
    if (!db) return [];
    const results = db.exec(`SELECT * FROM signals WHERE status = 'open' ORDER BY timestamp DESC`);
    return this.parseResults(results);
  },

  updateStatus(id: string, status: string, closedPrice: number, pnlPct1x: number, exitReason: string) {
    if (!db) return;
    db.run(`UPDATE signals SET status = ?, closed_at = ?, closed_price = ?, pnl_pct_1x = ?, pnl_pct_2x = ?, pnl_pct_3x = ?, pnl_pct_5x = ?, exit_reason = ? WHERE id = ?`,
      [status, Date.now(), closedPrice, pnlPct1x, pnlPct1x * 2, pnlPct1x * 3, pnlPct1x * 5, exitReason, id]);
    saveDb();
  },

  getStats(): SignalStats {
    if (!db) return this.emptyStats();
    try {
    return this._computeStats();
    } catch (e) {
      console.error('[DB] getStats error:', e);
      return this.emptyStats();
    }
  },

  _computeStats(): SignalStats {
    const total = this.getInt(`SELECT COUNT(*) FROM signals`);
    const won = this.getInt(`SELECT COUNT(*) FROM signals WHERE status = 'won'`);
    const lost = this.getInt(`SELECT COUNT(*) FROM signals WHERE status = 'lost'`);
    const open = this.getInt(`SELECT COUNT(*) FROM signals WHERE status = 'open'`);
    const avgConf = this.getFloat(`SELECT AVG(confidence) FROM signals`) || 0;

    const totalPnl1x = this.getFloat(`SELECT SUM(pnl_pct_1x) FROM signals WHERE pnl_pct_1x IS NOT NULL`) || 0;
    const totalPnl2x = this.getFloat(`SELECT SUM(pnl_pct_2x) FROM signals WHERE pnl_pct_1x IS NOT NULL`) || 0;
    const totalPnl3x = this.getFloat(`SELECT SUM(pnl_pct_3x) FROM signals WHERE pnl_pct_1x IS NOT NULL`) || 0;
    const totalPnl5x = this.getFloat(`SELECT SUM(pnl_pct_5x) FROM signals WHERE pnl_pct_1x IS NOT NULL`) || 0;

    const bestSymRaw = db!.exec(`SELECT symbol, SUM(pnl_pct_1x) as pnl FROM signals WHERE pnl_pct_1x IS NOT NULL GROUP BY symbol ORDER BY pnl DESC LIMIT 1`);
    const bestSym = bestSymRaw.length && bestSymRaw[0].values.length ? bestSymRaw[0].values[0][0] as string : '-';

    const bestTfRaw = db!.exec(`SELECT timeframe, SUM(pnl_pct_1x) as pnl FROM signals WHERE pnl_pct_1x IS NOT NULL GROUP BY timeframe ORDER BY pnl DESC LIMIT 1`);
    const bestTf = bestTfRaw.length && bestTfRaw[0].values.length ? bestTfRaw[0].values[0][0] as string : '-';

    const bestLev = totalPnl5x >= totalPnl3x && totalPnl5x >= totalPnl2x && totalPnl5x >= totalPnl1x ? '5x'
      : totalPnl3x >= totalPnl2x && totalPnl3x >= totalPnl1x ? '3x'
      : totalPnl2x >= totalPnl1x ? '2x' : '1x';

    const byTfRaw = db!.exec(`SELECT timeframe, COUNT(*) as total, SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won, SUM(pnl_pct_1x) as pnl1x, SUM(pnl_pct_5x) as pnl5x FROM signals GROUP BY timeframe`);
    const byTimeframe = this.parseSimpleResults(byTfRaw).map((r: any) => ({
      timeframe: r.timeframe,
      total: r.total,
      won: r.won,
      winRate: r.total > 0 ? (r.won / r.total) * 100 : 0,
      pnl1x: r.pnl1x || 0,
      pnl5x: r.pnl5x || 0
    }));

    const bySymRaw = db!.exec(`SELECT symbol, COUNT(*) as total, SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won, SUM(pnl_pct_1x) as pnl1x, SUM(pnl_pct_5x) as pnl5x FROM signals GROUP BY symbol ORDER BY total DESC LIMIT 10`);
    const bySymbol = this.parseSimpleResults(bySymRaw).map((r: any) => ({
      symbol: r.symbol,
      total: r.total,
      won: r.won,
      winRate: r.total > 0 ? (r.won / r.total) * 100 : 0,
      pnl1x: r.pnl1x || 0,
      pnl5x: r.pnl5x || 0
    }));

    const byTypeRaw = db!.exec(`SELECT type, COUNT(*) as total, SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won, SUM(pnl_pct_1x) as pnl1x FROM signals GROUP BY type`);
    const byType = this.parseSimpleResults(byTypeRaw).map((r: any) => ({
      type: r.type,
      total: r.total,
      won: r.won,
      winRate: r.total > 0 ? (r.won / r.total) * 100 : 0,
      pnl1x: r.pnl1x || 0
    }));

    const eqRaw = db!.exec(`SELECT date(timestamp/1000, 'unixepoch') as date, SUM(pnl_pct_1x) as eq FROM signals WHERE pnl_pct_1x IS NOT NULL GROUP BY date ORDER BY date`);
    const equityCurve: { date: string; equity1x: number; equity2x: number; equity5x: number }[] = [];
    let eq1x = 100, eq2x = 100, eq5x = 100;
    for (const row of eqRaw) {
      for (let i = 0; i < row.values.length; i++) {
        const date = row.values[i][0] as string;
        const pnl = row.values[i][1] as number || 0;
        eq1x += pnl;
        eq2x += pnl * 2;
        eq5x += pnl * 5;
        equityCurve.push({ date, equity1x: Math.round(eq1x * 100) / 100, equity2x: Math.round(eq2x * 100) / 100, equity5x: Math.round(eq5x * 100) / 100 });
      }
    }

    const monthlyRaw = db!.exec(`SELECT strftime('%Y-%m', timestamp/1000, 'unixepoch') as month, COUNT(*) as total, SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won, SUM(pnl_pct_1x) as pnl1x, SUM(pnl_pct_5x) as pnl5x FROM signals GROUP BY month ORDER BY month DESC LIMIT 12`);
    const monthlyStats = this.parseSimpleResults(monthlyRaw).map((r: any) => ({
      month: r.month,
      signals: r.total,
      winRate: r.total > 0 ? Math.round((r.won / r.total) * 100) : 0,
      pnl1x: Math.round((r.pnl1x || 0) * 100) / 100,
      pnl5x: Math.round((r.pnl5x || 0) * 100) / 100
    }));

    return {
      total, won, lost, open,
      winRate: total > 0 ? Math.round((won / total) * 10000) / 100 : 0,
      avgConfidence: Math.round(avgConf * 100) / 100,
      totalPnl1x: Math.round(totalPnl1x * 100) / 100,
      totalPnl2x: Math.round(totalPnl2x * 100) / 100,
      totalPnl3x: Math.round(totalPnl3x * 100) / 100,
      totalPnl5x: Math.round(totalPnl5x * 100) / 100,
      bestSymbol: bestSym,
      bestTimeframe: bestTf,
      bestLeverage: bestLev,
      byTimeframe,
      bySymbol,
      byType,
      equityCurve,
      monthlyStats
    };
  },

  getInt(sql: string): number {
    if (!db) return 0;
    const r = db.exec(sql);
    return (r[0]?.values[0]?.[0] as number) || 0;
  },

  getFloat(sql: string): number {
    if (!db) return 0;
    const r = db.exec(sql);
    return (r[0]?.values[0]?.[0] as number) || 0;
  },

  emptyStats(): SignalStats {
    return {
      total: 0, won: 0, lost: 0, open: 0, winRate: 0, avgConfidence: 0,
      totalPnl1x: 0, totalPnl2x: 0, totalPnl3x: 0, totalPnl5x: 0,
      bestSymbol: '-', bestTimeframe: '-', bestLeverage: '-',
      byTimeframe: [], bySymbol: [], byType: [],
      equityCurve: [], monthlyStats: []
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
      cols.forEach((col: string, i: number) => { obj[col] = row[i]; });
      return obj;
    });
  }
};
