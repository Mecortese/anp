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
let db = null;
async function initDb() {
    const SQL = await initSqlJs();
    if (existsSync(dbPath)) {
        const buffer = readFileSync(dbPath);
        db = new SQL.Database(buffer);
    }
    else {
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
    db.run(`CREATE INDEX IF NOT EXISTS idx_symbol ON signals(symbol)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_timestamp ON signals(timestamp)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_status ON signals(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_timeframe ON signals(timeframe)`);
    saveDb();
}
function saveDb() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        writeFileSync(dbPath, buffer);
    }
}
export const signalDb = {
    initialized: false,
    async init() {
        await initDb();
        this.initialized = true;
        console.log(`[DB] SQLite at ${dbPath}`);
    },
    save(signal) {
        if (!db)
            return;
        db.run(`
      INSERT OR REPLACE INTO signals VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
    `, [
            signal.id, signal.timestamp, signal.symbol, signal.type,
            signal.entryPrice, signal.stopLoss, signal.takeProfit, signal.slPct, signal.tpPct,
            signal.confidence, signal.timeframe, signal.reason, signal.strategies,
            signal.rsi, signal.macdValue, signal.macdSignal, signal.macdHistogram,
            signal.emaFast, signal.emaSlow, signal.emaSignal,
            signal.bollingerUpper, signal.bollingerMiddle, signal.bollingerLower,
            signal.atr, signal.volumeRatio, signal.trend
        ]);
        saveDb();
    },
    getAll(limit = 500) {
        if (!db)
            return [];
        const results = db.exec(`SELECT * FROM signals ORDER BY timestamp DESC LIMIT ${limit}`);
        return this.parseResults(results);
    },
    getBySymbol(symbol, limit = 100) {
        if (!db)
            return [];
        const results = db.exec(`SELECT * FROM signals WHERE symbol = '${symbol}' ORDER BY timestamp DESC LIMIT ${limit}`);
        return this.parseResults(results);
    },
    getOpen() {
        if (!db)
            return [];
        const results = db.exec(`SELECT * FROM signals WHERE status = 'open' ORDER BY timestamp DESC`);
        return this.parseResults(results);
    },
    updateStatus(id, status, closedPrice, pnlPct1x, exitReason) {
        if (!db)
            return;
        db.run(`UPDATE signals SET status = ?, closed_at = ?, closed_price = ?, pnl_pct_1x = ?, pnl_pct_2x = ?, pnl_pct_3x = ?, pnl_pct_5x = ?, exit_reason = ? WHERE id = ?`, [status, Date.now(), closedPrice, pnlPct1x, pnlPct1x * 2, pnlPct1x * 3, pnlPct1x * 5, exitReason, id]);
        saveDb();
    },
    getStats() {
        if (!db)
            return this.emptyStats();
        const total = this.getInt(`SELECT COUNT(*) FROM signals`);
        const won = this.getInt(`SELECT COUNT(*) FROM signals WHERE status = 'won'`);
        const lost = this.getInt(`SELECT COUNT(*) FROM signals WHERE status = 'lost'`);
        const open = this.getInt(`SELECT COUNT(*) FROM signals WHERE status = 'open'`);
        const avgConf = this.getFloat(`SELECT AVG(confidence) FROM signals`) || 0;
        const totalPnl1x = this.getFloat(`SELECT SUM(pnl_pct_1x) FROM signals WHERE pnl_pct_1x IS NOT NULL`) || 0;
        const totalPnl2x = this.getFloat(`SELECT SUM(pnl_pct_2x) FROM signals WHERE pnl_pct_2x IS NOT NULL`) || 0;
        const totalPnl3x = this.getFloat(`SELECT SUM(pnl_pct_3x) FROM signals WHERE pnl_pct_3x IS NOT NULL`) || 0;
        const totalPnl5x = this.getFloat(`SELECT SUM(pnl_pct_5x) FROM signals WHERE pnl_pct_5x IS NOT NULL`) || 0;
        const bestSymRaw = db.exec(`SELECT symbol, SUM(pnl_pct_1x) as pnl FROM signals WHERE pnl_pct_1x IS NOT NULL GROUP BY symbol ORDER BY pnl DESC LIMIT 1`);
        const bestSym = bestSymRaw.length && bestSymRaw[0].values.length ? bestSymRaw[0].values[0][0] : '-';
        const bestTfRaw = db.exec(`SELECT timeframe, SUM(pnl_pct_1x) as pnl FROM signals WHERE pnl_pct_1x IS NOT NULL GROUP BY timeframe ORDER BY pnl DESC LIMIT 1`);
        const bestTf = bestTfRaw.length && bestTfRaw[0].values.length ? bestTfRaw[0].values[0][0] : '-';
        const bestLev = totalPnl5x >= totalPnl3x && totalPnl5x >= totalPnl2x && totalPnl5x >= totalPnl1x ? '5x'
            : totalPnl3x >= totalPnl2x && totalPnl3x >= totalPnl1x ? '3x'
                : totalPnl2x >= totalPnl1x ? '2x' : '1x';
        const byTfRaw = db.exec(`SELECT timeframe, COUNT(*) as total, SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won, SUM(pnl_pct_1x) as pnl1x, SUM(pnl_pct_5x) as pnl5x FROM signals GROUP BY timeframe`);
        const byTimeframe = this.parseSimpleResults(byTfRaw).map((r) => ({
            timeframe: r.timeframe,
            total: r.total,
            won: r.won,
            winRate: r.total > 0 ? (r.won / r.total) * 100 : 0,
            pnl1x: r.pnl1x || 0,
            pnl5x: r.pnl5x || 0
        }));
        const bySymRaw = db.exec(`SELECT symbol, COUNT(*) as total, SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won, SUM(pnl_pct_1x) as pnl1x, SUM(pnl_pct_5x) as pnl5x FROM signals GROUP BY symbol ORDER BY total DESC LIMIT 10`);
        const bySymbol = this.parseSimpleResults(bySymRaw).map((r) => ({
            symbol: r.symbol,
            total: r.total,
            won: r.won,
            winRate: r.total > 0 ? (r.won / r.total) * 100 : 0,
            pnl1x: r.pnl1x || 0,
            pnl5x: r.pnl5x || 0
        }));
        const byTypeRaw = db.exec(`SELECT type, COUNT(*) as total, SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won, SUM(pnl_pct_1x) as pnl1x FROM signals GROUP BY type`);
        const byType = this.parseSimpleResults(byTypeRaw).map((r) => ({
            type: r.type,
            total: r.total,
            won: r.won,
            winRate: r.total > 0 ? (r.won / r.total) * 100 : 0,
            pnl1x: r.pnl1x || 0
        }));
        const eqRaw = db.exec(`SELECT date(timestamp/1000, 'unixepoch') as date, SUM(pnl_pct_1x) as eq FROM signals WHERE pnl_pct_1x IS NOT NULL GROUP BY date ORDER BY date`);
        const equityCurve = [];
        let eq1x = 100, eq2x = 100, eq5x = 100;
        for (const row of eqRaw) {
            for (let i = 0; i < row.values.length; i++) {
                const date = row.values[i][0];
                const pnl = row.values[i][1] || 0;
                eq1x += pnl;
                eq2x += pnl * 2;
                eq5x += pnl * 5;
                equityCurve.push({ date, equity1x: Math.round(eq1x * 100) / 100, equity2x: Math.round(eq2x * 100) / 100, equity5x: Math.round(eq5x * 100) / 100 });
            }
        }
        const monthlyRaw = db.exec(`SELECT strftime('%Y-%m', timestamp/1000, 'unixepoch') as month, COUNT(*) as total, SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won, SUM(pnl_pct_1x) as pnl1x, SUM(pnl_pct_5x) as pnl5x FROM signals GROUP BY month ORDER BY month DESC LIMIT 12`);
        const monthlyStats = this.parseSimpleResults(monthlyRaw).map((r) => ({
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
    getInt(sql) {
        if (!db)
            return 0;
        const r = db.exec(sql);
        return r[0]?.values[0]?.[0] || 0;
    },
    getFloat(sql) {
        if (!db)
            return 0;
        const r = db.exec(sql);
        return r[0]?.values[0]?.[0] || 0;
    },
    emptyStats() {
        return {
            total: 0, won: 0, lost: 0, open: 0, winRate: 0, avgConfidence: 0,
            totalPnl1x: 0, totalPnl2x: 0, totalPnl3x: 0, totalPnl5x: 0,
            bestSymbol: '-', bestTimeframe: '-', bestLeverage: '-',
            byTimeframe: [], bySymbol: [], byType: [],
            equityCurve: [], monthlyStats: []
        };
    },
    parseResults(results) {
        if (!results.length || !results[0].values.length)
            return [];
        const cols = results[0].columns;
        return results[0].values.map((row) => {
            const obj = {};
            cols.forEach((col, i) => {
                const camelCol = col.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
                obj[camelCol] = row[i];
            });
            return obj;
        });
    },
    parseSimpleResults(results) {
        if (!results.length || !results[0].values.length)
            return [];
        const cols = results[0].columns;
        return results[0].values.map((row) => {
            const obj = {};
            cols.forEach((col, i) => { obj[col] = row[i]; });
            return obj;
        });
    }
};
