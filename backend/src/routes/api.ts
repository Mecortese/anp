import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { signalDb } from '../services/database.js';
import { commodityService } from '../services/commodities.js';
import { BinancePolling } from '../services/binancePolling.js';
import { TechnicalAnalyzer } from '../services/indicators.js';
import type { Kline, TechnicalIndicators, Signal } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';
let frontendDistPath: string;

if (isProd) {
  const cwd = process.cwd();
  frontendDistPath = cwd.endsWith('/backend') 
    ? path.join(cwd, 'frontend-dist')
    : path.join(cwd, 'backend', 'frontend-dist');
} else {
  frontendDistPath = path.join(__dirname, '../../frontend/dist');
}

console.log('[SERVER] Frontend path:', frontendDistPath);

const app = express();
app.use(cors());
app.use(express.json());

const tickers: Map<string, any> = new Map();
let tickersLastUpdate = 0;

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), tickersUpdated: tickersLastUpdate });
});

app.get('/api/signals', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const symbol = req.query.symbol as string;
  if (symbol) {
    res.json(signalDb.getBySymbol(symbol, limit));
  } else {
    res.json(signalDb.getAll(limit));
  }
});

app.get('/api/signals/open', (req, res) => {
  res.json(signalDb.getOpen());
});

app.get('/api/signals/stats', (req, res) => {
  res.json(signalDb.getStats());
});

app.get('/api/commodities', async (req, res) => {
  try {
    const commodities = await commodityService.getAllCommodities();
    res.json(commodities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch commodities' });
  }
});

app.get('/api/assets', (req, res) => {
  res.json(Array.from(tickers.values()));
});

app.get('/api/tickers', (req, res) => {
  res.json(Array.from(tickers.values()));
});

app.use(express.static(frontendDistPath));

app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

const polling = new BinancePolling((newTickers) => {
  newTickers.forEach(t => {
    tickers.set(t.symbol, {
      symbol: t.symbol,
      name: t.symbol.replace('USDT', ''),
      price: t.price,
      change24h: t.change24h,
      volume24h: t.volume24h
    });
    tickersLastUpdate = Date.now();
  });
});

export { app, polling };