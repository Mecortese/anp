import express from 'express';
import cors from 'cors';
import { signalDb } from '../services/database.js';
import { commodityService } from '../services/commodities.js';

const app = express();
app.use(cors());
app.use(express.json());

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

app.get('/api/commodities', async (req, res) => {
  try {
    const commodities = await commodityService.getAllCommodities();
    res.json(commodities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch commodities' });
  }
});

app.use(express.static('../frontend/dist'));

app.get('*', (req, res) => {
  res.sendFile('../frontend/dist/index.html');
});

export { app };