import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { signalDb } from '../services/database.js';
import { commodityService } from '../services/commodities.js';
import { fetchTickers, getTickers, getPollingStatus } from '../services/binancePolling.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';

let frontendDistPath: string;

if (isProd) {
  const cwd = process.cwd();
  console.log('[SERVER] Production CWD:', cwd);
  
  if (cwd.endsWith('/app/backend')) {
    frontendDistPath = path.join(cwd, 'frontend-dist');
  } else if (cwd.endsWith('/app')) {
    frontendDistPath = path.join(cwd, 'backend', 'frontend-dist');
  } else {
    frontendDistPath = path.join(cwd, 'frontend-dist');
  }
} else {
  frontendDistPath = path.join(__dirname, '../../frontend/dist');
}

console.log('[SERVER] Frontend dist path:', frontendDistPath);

const app = express();
app.use(cors());
app.use(express.json());

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