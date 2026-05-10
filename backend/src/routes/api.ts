import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { signalDb } from '../services/database.js';
import { commodityService } from '../services/commodities.js';
import { existsSync, readdirSync } from 'fs';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cwd = process.cwd();
const possiblePaths = [
  path.join(cwd, 'frontend-dist'),
  path.join(cwd, 'backend', 'frontend-dist'),
  path.join(cwd, '..', 'frontend-dist'),
];

let frontendDistPath = '';
for (const p of possiblePaths) {
  if (existsSync(path.join(p, 'index.html'))) {
    frontendDistPath = p;
    break;
  }
}
if (!frontendDistPath) frontendDistPath = path.join(cwd, 'frontend-dist');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/debug', (req, res) => {
  res.json({ cwd, frontendDistPath, lsCwd: readdirSync(cwd) });
});

app.get('/api/klines', (req, res) => {
  const { symbol, interval = '1H', limit = 200 } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  const path = `/api/v5/market/history-candles?instId=${symbol}&bar=${interval}&limit=${limit}`;
  console.log(`[PROXY] OKX klines: ${symbol} ${interval}`);

  const options = {
    hostname: 'www.okx.com',
    path,
    method: 'GET'
  };

  const proxyReq = https.request(options, (proxyRes) => {
    let data = '';
    proxyRes.on('data', chunk => data += chunk);
    proxyRes.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.code !== '0') return res.status(502).json({ error: parsed.msg });
        res.json(parsed.data || []);
      } catch {
        res.status(502).json({ error: 'Invalid OKX response' });
      }
    });
  });

  proxyReq.on('error', err => res.status(502).json({ error: err.message }));
  proxyReq.end();
});

app.get('/api/ticker', (req, res) => {
  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  const path = `/api/v5/market/ticker?instId=${symbol}`;
  const options = {
    hostname: 'www.okx.com',
    path,
    method: 'GET'
  };

  const proxyReq = https.request(options, (proxyRes) => {
    let data = '';
    proxyRes.on('data', chunk => data += chunk);
    proxyRes.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        res.json(parsed.data?.[0] || {});
      } catch {
        res.status(502).json({ error: 'Invalid OKX response' });
      }
    });
  });

  proxyReq.on('error', err => res.status(502).json({ error: err.message }));
  proxyReq.end();
});

app.get('/api/signals', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  res.json(signalDb.getAll(limit));
});

app.get('/api/signals/open', (req, res) => res.json(signalDb.getOpen()));
app.get('/api/signals/stats', (req, res) => res.json(signalDb.getStats()));

app.post('/api/signals', (req, res) => {
  try {
    signalDb.save(req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.put('/api/signals/:id', (req, res) => {
  try {
    const { status, closedPrice, pnlPct1x, exitReason } = req.body;
    if (status && closedPrice !== undefined) {
      signalDb.updateStatus(req.params.id, status, closedPrice, pnlPct1x, exitReason);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/signals/export/csv', (req, res) => {
  try {
    const signals = signalDb.getAll(1000);
    const headers = ['ID', 'Fecha', 'Symbol', 'Tipo', 'Entry', 'SL', 'TP', 'SL%', 'TP%', 'Confianza', 'Timeframe', 'Razón', 'Estrategias', 'RSI', 'MACD', 'MACD_Signal', 'MACD_Hist', 'EMA_Fast', 'EMA_Slow', 'BB_Upper', 'BB_Middle', 'BB_Lower', 'ATR', 'Vol_Ratio', 'Trend', 'Estado', 'Closed_At', 'Closed_Price', 'P&L_1x', 'P&L_2x', 'P&L_3x', 'P&L_5x', 'Exit_Reason'].join(',');
    const rows = signals.map(s => [
      s.id, new Date(s.timestamp).toISOString(), s.symbol, s.type,
      s.entryPrice, s.stopLoss, s.takeProfit, s.slPct, s.tpPct,
      s.confidence, s.timeframe, `"${(s.reason||'').replace(/"/g,'""')}"`, `"${(s.strategies||'').replace(/"/g,'""')}"`,
      s.rsi, s.macdValue, s.macdSignal, s.macdHistogram,
      s.emaFast, s.emaSlow, s.bollingerUpper, s.bollingerMiddle, s.bollingerLower,
      s.atr, s.volumeRatio, s.trend, s.status,
      s.closedAt ? new Date(s.closedAt).toISOString() : '',
      s.closedPrice || '', s.pnlPct1x || '', s.pnlPct2x || '', s.pnlPct3x || '', s.pnlPct5x || '',
      `"${(s.exitReason||'').replace(/"/g,'""')}"`
    ].join(','));
    const csv = [headers, ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="signals_${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/commodities', async (req, res) => {
  try {
    res.json(await commodityService.getAllCommodities());
  } catch {
    res.status(500).json({ error: 'Failed to fetch commodities' });
  }
});

app.use(express.static(frontendDistPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

export { app };
