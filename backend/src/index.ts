import express from 'express';
import { signalsRouter } from './routes/signals.js';
import { userSignalsRouter } from './routes/userSignals.js';
import { startPricePoller } from './services/pricePoller.js';
import { signalDb } from './services/database.js';
import { mkdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';

const frontendDistPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'frontend-dist'),
    path.join(process.cwd(), '..', 'frontend-dist'),
  ];
  for (const p of candidates) { if (existsSync(path.join(p, 'index.html'))) return p; }
  return candidates[0];
})();

mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });

const PORT = parseInt(process.env.PORT || '3000');

function calcEMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0;
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < data.length; i++) ema = data[i] * k + ema * (1 - k);
  return ema;
}

function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  const avgGain = gains / period, avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

async function main() {
  console.log('Crypto Signals Server Starting...');
  await signalDb.init();

  const app = express();
  app.use(express.json());

  app.use(signalsRouter());
  app.use(userSignalsRouter());

  app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

  app.get('/api/setups', async (req, res) => {
    const DEFAULT_SYMBOLS = 'BTCUSDT,ETHUSDT,BNBUSDT,SOLUSDT,XRPUSDT,ADAUSDT,LINKUSDT,DOGEUSDT,AVAXUSDT,MATICUSDT';
    const symbols = (req.query.symbols as string || DEFAULT_SYMBOLS).split(',');
    const timeframes = (req.query.intervals as string || '1H,4H').split(',');
    const results: any[] = [];
    let completed = 0;

    const allSymbols = symbols.flatMap(s => timeframes.map(tf => ({ symbol: s, timeframe: tf })));
    const fundCache: Record<string, string> = {};

    for (const { symbol, timeframe } of allSymbols) {
      const okxSym = symbol.includes('-') ? symbol : `${symbol.slice(0, -4)}-USDT`;
      const klinePath = `/api/v5/market/history-candles?instId=${okxSym}&bar=${timeframe}&limit=100`;

      const [klineData, fundData] = await Promise.all([
        new Promise<string>((resolve) => {
          const req = http.request({ hostname: 'www.okx.com', path: klinePath, method: 'GET' }, (r) => {
            let d = ''; r.on('data', c => d += c); r.on('end', () => resolve(d));
          });
          req.on('error', () => resolve('')); req.end();
        }),
        new Promise<string>((resolve) => {
          if (fundCache[okxSym]) { resolve(fundCache[okxSym]); return; }
          const fundPath = `/api/v5/public/funding-rate?instId=${okxSym}-SWAP`;
          const req = http.request({ hostname: 'www.okx.com', path: fundPath, method: 'GET' }, (r) => {
            let d = ''; r.on('data', c => d += c); r.on('end', () => { fundCache[okxSym] = d; resolve(d); });
          });
          req.on('error', () => resolve('')); req.end();
        })
      ]);

      try {
        const klines = JSON.parse(klineData);
        const funding = JSON.parse(fundData);
        if (klines.code === '0' && klines.data?.length >= 20) {
          const closes = klines.data.map((k: string[]) => parseFloat(k[4]));
          const lastClose = closes[closes.length - 1];
          const fundingRate = funding.code === '0' && funding.data?.[0] ? parseFloat(funding.data[0].fundingRate) * 100 : 0;
          const ema9 = calcEMA(closes.slice(-30), 9);
          const ema21 = calcEMA(closes.slice(-50), 21);
          const rsiVal = calcRSI(closes);
          const macdHist = calcEMA(closes, 12) - calcEMA(closes, 26);
          const isBullish = lastClose > ema9 && ema9 > ema21;
          const isBearish = lastClose < ema9 && ema9 < ema21;

          const score = Math.round(
            50 + (isBullish ? 20 : isBearish ? -10 : 0) +
            (rsiVal < 35 ? 20 : rsiVal < 45 ? 10 : rsiVal > 65 ? -15 : rsiVal > 55 ? -5 : 0) +
            (fundingRate < -0.01 ? 15 : fundingRate < -0.005 ? 8 : fundingRate > 0.01 ? -15 : fundingRate > 0.005 ? -8 : 0)
          );
          const finalScore = Math.max(0, Math.min(100, score));

          if (finalScore >= 65) {
            const type = finalScore >= 82 ? 'long' : 'short';
            const sl = type === 'long' ? lastClose * 0.98 : lastClose * 1.02;
            const tp = type === 'long' ? lastClose * 1.04 : lastClose * 0.96;
            const edges: string[] = [];
            if (isBullish) edges.push('EMA Bull');
            if (isBearish) edges.push('EMA Bear');
            if (rsiVal < 35) edges.push(`RSI ${rsiVal.toFixed(1)} OS`);
            if (rsiVal < 45 && rsiVal >= 35) edges.push(`RSI ${rsiVal.toFixed(1)}`);
            if (rsiVal > 65) edges.push(`RSI ${rsiVal.toFixed(1)} OB`);
            if (fundingRate < -0.01) edges.push(`Fund ${(fundingRate * 100).toFixed(2)}% Short`);
            if (fundingRate > 0.01) edges.push(`Fund ${(fundingRate * 100).toFixed(2)}% Long`);
            if (fundingRate < -0.03) edges.push('&#9889; SHORT SQUEEZE');

            results.push({
              id: `setup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              symbol, type, timeframe,
              convictionScore: finalScore,
              leverageRecommendation: finalScore >= 92 ? 5 : finalScore >= 85 ? 3 : finalScore >= 78 ? 2 : 1,
              riskLevel: edges.length >= 3 ? 'high' : edges.length >= 2 ? 'medium' : 'low',
              entryPrice: lastClose,
              stopLoss: Math.round(sl * 100) / 100,
              takeProfit: Math.round(tp * 100) / 100,
              slPct: 2, tpPct: 4,
              edges, reason: edges.slice(0, 3).join(' + '),
              fundingRate, rsi: Math.round(rsiVal * 10) / 10,
              macdHistogram: Math.round(macdHist * 1000) / 1000,
              volumeRatio: 1,
              timestamp: Date.now(),
            });
          }
        }
      } catch {}

      completed++;
      if (completed === allSymbols.length) {
        res.json(results.sort((a, b) => b.convictionScore - a.convictionScore));
      }
    }
  });

  app.use(express.static(frontendDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });

  http.createServer(app).listen(PORT, '0.0.0.0', () => {
    console.log(`Server on port ${PORT}`);
  });

  if (isProd) {
    startPricePoller(300000);
  }
}

main().catch(console.error);
