import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { signalDb } from '../services/database.js';
import { commodityService } from '../services/commodities.js';
import { fetchTickers, getTickers, getPollingStatus } from '../services/binancePolling.js';
import { readdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cwd = process.cwd();

const possiblePaths = [
  path.join(cwd, 'frontend-dist'),
  path.join(cwd, 'backend', 'frontend-dist'),
  path.join(cwd, '..', 'frontend-dist'),
  path.join(__dirname, '../../frontend/dist'),
  path.join(__dirname, '../../../frontend-dist'),
];

let frontendDistPath = '';
for (const p of possiblePaths) {
  if (existsSync(path.join(p, 'index.html'))) {
    frontendDistPath = p;
    break;
  }
}

if (!frontendDistPath) {
  frontendDistPath = path.join(cwd, 'frontend-dist');
}

console.log('[SERVER] CWD:', cwd);
console.log('[SERVER] Frontend dist path:', frontendDistPath);
console.log('[SERVER] Index exists:', existsSync(path.join(frontendDistPath, 'index.html')));

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/debug', (req, res) => {
  res.json({
    cwd,
    frontendDistPath,
    indexExists: existsSync(path.join(frontendDistPath, 'index.html')),
    lsCwd: readdirSync(cwd),
    possiblePaths: possiblePaths.map(p => ({ path: p, exists: existsSync(path.join(p, 'index.html')) }))
  });
});

app.get('/api/health', (req, res) => {
  const status = getPollingStatus();
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    polling: status,
    tickersCount: getTickers().length
  });
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
  res.json(getTickers());
});

app.get('/api/tickers', (req, res) => {
  res.json(getTickers());
});

app.use(express.static(frontendDistPath));

app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

export { app, fetchTickers };
