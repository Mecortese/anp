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
if (!frontendDistPath)
    frontendDistPath = path.join(cwd, 'frontend-dist');
const app = express();
app.use(cors());
app.use(express.json());
function calculateEMA(data, period) {
    if (data.length < period)
        return data[data.length - 1] || 0;
    const k = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < data.length; i++)
        ema = data[i] * k + ema * (1 - k);
    return ema;
}
function calculateRSI(closes, period = 14) {
    if (closes.length < period + 1)
        return 50;
    let gains = 0, losses = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff > 0)
            gains += diff;
        else
            losses -= diff;
    }
    const avgGain = gains / period, avgLoss = losses / period;
    if (avgLoss === 0)
        return 100;
    return 100 - 100 / (1 + avgGain / avgLoss);
}
function calculateMACDHistogram(closes) {
    const ema12 = calculateEMA(closes, 12);
    const ema26 = calculateEMA(closes, 26);
    return ema12 - ema26;
}
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});
app.get('/api/debug', (req, res) => {
    res.json({ cwd, frontendDistPath, lsCwd: readdirSync(cwd) });
});
app.get('/api/klines', (req, res) => {
    const { symbol, interval = '1H', limit = 200 } = req.query;
    if (!symbol)
        return res.status(400).json({ error: 'symbol required' });
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
                if (parsed.code !== '0')
                    return res.status(502).json({ error: parsed.msg });
                res.json(parsed.data || []);
            }
            catch {
                res.status(502).json({ error: 'Invalid OKX response' });
            }
        });
    });
    proxyReq.on('error', err => res.status(502).json({ error: err.message }));
    proxyReq.end();
});
app.get('/api/ticker', (req, res) => {
    const { symbol } = req.query;
    if (!symbol)
        return res.status(400).json({ error: 'symbol required' });
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
            }
            catch {
                res.status(502).json({ error: 'Invalid OKX response' });
            }
        });
    });
    proxyReq.on('error', err => res.status(502).json({ error: err.message }));
    proxyReq.end();
});
app.get('/api/funding-rates', (req, res) => {
    const symbols = (req.query.symbols || 'BTC-USDT,ETH-USDT,BNB-USDT,SOL-USDT,XRP-USDT').split(',');
    const results = [];
    let completed = 0;
    for (const symbol of symbols) {
        const path = `/api/v5/public/funding-rate?instId=${symbol}`;
        const options = { hostname: 'www.okx.com', path, method: 'GET' };
        const proxyReq = https.request(options, (proxyRes) => {
            let data = '';
            proxyRes.on('data', chunk => data += chunk);
            proxyRes.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.code === '0' && parsed.data?.[0]) {
                        const d = parsed.data[0];
                        results.push({
                            symbol: symbol.replace('-USDT', 'USDT'),
                            rate: parseFloat(d.fundingRate) * 100,
                            nextFundingTime: parseInt(d.nextFundingTime),
                            timestamp: Date.now()
                        });
                    }
                }
                catch { }
                completed++;
                if (completed === symbols.length)
                    res.json(results);
            });
        });
        proxyReq.on('error', () => { completed++; if (completed === symbols.length)
            res.json(results); });
        proxyReq.end();
    }
});
app.get('/api/setups', async (req, res) => {
    const symbols = (req.query.symbols || 'BTCUSDT,ETHUSDT,BNBUSDT,SOLUSDT').split(',');
    const timeframe = req.query.interval || '1H';
    const results = [];
    let completed = 0;
    for (const symbol of symbols) {
        const klinePath = `/api/v5/market/history-candles?instId=${symbol}&bar=${timeframe}&limit=100`;
        const fundPath = `/api/v5/public/funding-rate?instId=${symbol.replace('USDT', '-USDT')}`;
        const [klineData, fundData] = await Promise.all([
            new Promise((resolve) => {
                const req = https.request({ hostname: 'www.okx.com', path: klinePath, method: 'GET' }, (r) => {
                    let d = '';
                    r.on('data', c => d += c);
                    r.on('end', () => resolve(d));
                });
                req.on('error', () => resolve(''));
                req.end();
            }),
            new Promise((resolve) => {
                const req = https.request({ hostname: 'www.okx.com', path: fundPath, method: 'GET' }, (r) => {
                    let d = '';
                    r.on('data', c => d += c);
                    r.on('end', () => resolve(d));
                });
                req.on('error', () => resolve(''));
                req.end();
            })
        ]);
        try {
            const klines = JSON.parse(klineData);
            const funding = JSON.parse(fundData);
            if (klines.code === '0' && klines.data?.length >= 20) {
                const closes = klines.data.map((k) => parseFloat(k[4]));
                const lastClose = closes[closes.length - 1];
                const fundingRate = funding.code === '0' && funding.data?.[0] ? parseFloat(funding.data[0].fundingRate) * 100 : 0;
                const ema9 = calculateEMA(closes.slice(-30), 9);
                const ema21 = calculateEMA(closes.slice(-50), 21);
                const rsiVal = calculateRSI(closes);
                const macdHist = calculateMACDHistogram(closes);
                const isBullish = lastClose > ema9 && ema9 > ema21;
                const isBearish = lastClose < ema9 && ema9 < ema21;
                const score = Math.round(50 + (isBullish ? 20 : isBearish ? -10 : 0) + (rsiVal < 40 ? 15 : rsiVal > 60 ? -10 : 0) + (fundingRate < -0.03 ? 15 : fundingRate > 0.03 ? -15 : 0));
                const finalScore = Math.max(0, Math.min(100, score));
                if (finalScore >= 45) {
                    const type = finalScore > 65 ? 'long' : 'short';
                    const sl = type === 'long' ? lastClose * 0.985 : lastClose * 1.015;
                    const tp = type === 'long' ? lastClose * 1.02 : lastClose * 0.98;
                    const lev = finalScore >= 80 ? 5 : finalScore >= 70 ? 3 : finalScore >= 60 ? 2 : 1;
                    const edges = [];
                    if (isBullish)
                        edges.push('EMA Bullish');
                    if (isBearish)
                        edges.push('EMA Bearish');
                    if (rsiVal < 40)
                        edges.push('RSI Oversold');
                    if (rsiVal > 60)
                        edges.push('RSI Overbought');
                    if (fundingRate < -0.03)
                        edges.push('Funding Short Squeeze');
                    if (fundingRate > 0.03)
                        edges.push('Funding Long Squeeze');
                    results.push({
                        symbol,
                        type,
                        convictionScore: finalScore,
                        leverageRecommendation: lev,
                        riskLevel: edges.length >= 3 ? 'high' : edges.length >= 2 ? 'medium' : 'low',
                        entryPrice: lastClose,
                        stopLoss: Math.round(sl * 100) / 100,
                        takeProfit: Math.round(tp * 100) / 100,
                        slPct: 1.5,
                        tpPct: 2,
                        edges,
                        reason: edges.slice(0, 3).join(' + '),
                        timeframe,
                        fundingRate,
                        rsi: Math.round(rsiVal * 10) / 10,
                        macdHistogram: Math.round(macdHist * 1000) / 1000,
                        volumeRatio: 1,
                        timestamp: Date.now()
                    });
                }
            }
        }
        catch { }
        completed++;
        if (completed === symbols.length) {
            res.json(results.sort((a, b) => b.convictionScore - a.convictionScore));
        }
    }
});
app.get('/api/signals', (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    res.json(signalDb.getAll(limit));
});
app.get('/api/signals/open', (req, res) => res.json(signalDb.getOpen()));
app.get('/api/signals/stats', (req, res) => res.json(signalDb.getStats()));
app.post('/api/signals', (req, res) => {
    try {
        signalDb.save(req.body);
        res.json({ ok: true });
    }
    catch (err) {
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
    }
    catch (err) {
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
            s.confidence, s.timeframe, `"${(s.reason || '').replace(/"/g, '""')}"`, `"${(s.strategies || '').replace(/"/g, '""')}"`,
            s.rsi, s.macdValue, s.macdSignal, s.macdHistogram,
            s.emaFast, s.emaSlow, s.bollingerUpper, s.bollingerMiddle, s.bollingerLower,
            s.atr, s.volumeRatio, s.trend, s.status,
            s.closedAt ? new Date(s.closedAt).toISOString() : '',
            s.closedPrice || '', s.pnlPct1x || '', s.pnlPct2x || '', s.pnlPct3x || '', s.pnlPct5x || '',
            `"${(s.exitReason || '').replace(/"/g, '""')}"`
        ].join(','));
        const csv = [headers, ...rows].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="signals_${new Date().toISOString().slice(0, 10)}.csv"`);
        res.send(csv);
    }
    catch (err) {
        res.status(500).json({ error: String(err) });
    }
});
app.get('/api/commodities', async (req, res) => {
    try {
        res.json(await commodityService.getAllCommodities());
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch commodities' });
    }
});
app.use(express.static(frontendDistPath));
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
});
export { app };
