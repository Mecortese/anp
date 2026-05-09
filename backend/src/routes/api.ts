import express from 'express';
import cors from 'cors';
import type { Signal, Asset } from '../types/index.js';
import { commodityService } from '../services/commodities.js';
import { signalDb } from '../services/database.js';

const app = express();
app.use(cors());
app.use(express.json());

const assets: Map<string, Asset> = new Map();
const memorySignals: Signal[] = [];

export function addSignal(signal: Signal): void {
  memorySignals.unshift(signal);
  if (memorySignals.length > 100) memorySignals.pop();
}

export function updateAsset(asset: Asset): void {
  assets.set(asset.symbol, asset);
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
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

app.get('/api/assets', (req, res) => {
  res.json(Array.from(assets.values()));
});

app.get('/api/assets/:symbol', (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  res.json(assets.get(symbol) || null);
});

app.get('/api/commodities', async (req, res) => {
  try {
    const commodities = await commodityService.getAllCommodities();
    res.json(commodities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch commodities' });
  }
});

export { app };