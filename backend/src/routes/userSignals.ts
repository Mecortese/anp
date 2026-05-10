import express from 'express';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
mkdirSync(dataDir, { recursive: true });
const userSignalsPath = path.join(dataDir, 'user_signals.json');

function loadUserSignals(): Record<string, any[]> {
  if (existsSync(userSignalsPath)) {
    try { return JSON.parse(readFileSync(userSignalsPath, 'utf-8')); }
    catch { return {}; }
  }
  return {};
}

function saveUserSignals(data: Record<string, any[]>) {
  writeFileSync(userSignalsPath, JSON.stringify(data, null, 2));
}

function loadPriceCache(): Record<string, any> {
  if (existsSync(path.join(dataDir, 'price_cache.json'))) {
    try { return JSON.parse(readFileSync(path.join(dataDir, 'price_cache.json'), 'utf-8')); }
    catch { return {}; }
  }
  return {};
}

export function userSignalsRouter() {
  const router = express.Router();

  router.post('/user/signals', (req, res) => {
    try {
      const { oderId, userId, action, pnlPct1x, timestamp } = req.body;
      if (!userId || !action) { res.status(400).json({ error: 'userId and action required' }); return; }
      const data = loadUserSignals();
      if (!data[userId]) data[userId] = [];
      data[userId].push({ oderId, action, pnlPct1x, timestamp: timestamp || Date.now() });
      if (data[userId].length > 500) data[userId] = data[userId].slice(-500);
      saveUserSignals(data);
      res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/user/history', (req, res) => {
    try {
      let userId = String(req.query.userId || '');
      if (!userId || userId === 'undefined') {
        userId = String(req.query.anonymousId || 'anon');
      }
      const data = loadUserSignals();
      const signals = data[userId] || [];
      const priceCache = loadPriceCache();

      const taken = signals.filter((s: any) => s.action === 'taken');
      const resolved = signals.filter((s: any) => s.action === 'won' || s.action === 'lost');
      const won = resolved.filter((s: any) => s.action === 'won').length;
      const lost = resolved.filter((s: any) => s.action === 'lost').length;
      const totalPnl = resolved.filter((s: any) => s.pnlPct1x !== undefined)
        .reduce((sum: number, s: any) => sum + s.pnlPct1x, 0);

      const history = signals.map((s: any) => ({
        oderId: s.oderId,
        action: s.action,
        pnlPct1x: s.pnlPct1x,
        timestamp: s.timestamp,
        currentPrice: null,
      }));

      res.json({
        userId: userId.slice(0, 12) + '...',
        total: signals.length,
        taken: taken.length,
        resolved: resolved.length,
        won, lost,
        winRate: resolved.length > 0 ? Math.round((won / resolved.length) * 10000) / 100 : 0,
        totalPnl: Math.round(totalPnl * 100) / 100,
        history: history.reverse(),
      });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/user/leaderboard', (req, res) => {
    try {
      const data = loadUserSignals();
      const entries = Object.entries(data).map(([userId, signals]) => {
        const taken = signals.filter((s: any) => s.action === 'taken').length;
        const won = signals.filter((s: any) => s.action === 'won').length;
        const lost = signals.filter((s: any) => s.action === 'lost').length;
        const pnl = signals.filter((s: any) => s.pnlPct1x !== undefined)
          .reduce((sum: number, s: any) => sum + s.pnlPct1x, 0);
        const winRate = taken > 0 ? Math.round((won / taken) * 10000) / 100 : 0;
        const totalEquity = signals.reduce((eq: number, s: any) => eq + (s.pnlPct1x || 0), 0);
        return { oderId: userId.slice(0, 12) + '...', taken, won, lost, pnl: Math.round(pnl * 100) / 100, winRate, equity: Math.round(totalEquity * 100) / 100 };
      });
      const sorted = entries.sort((a, b) => b.equity - a.equity);
      res.json(sorted.slice(0, 50));
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/user/community', (req, res) => {
    try {
      const data = loadUserSignals();
      let totalTaken = 0, totalWon = 0, totalLost = 0, totalPnl = 0;
      for (const signals of Object.values(data)) {
        totalTaken += signals.filter((s: any) => s.action === 'taken').length;
        totalWon += signals.filter((s: any) => s.action === 'won').length;
        totalLost += signals.filter((s: any) => s.action === 'lost').length;
        totalPnl += signals.filter((s: any) => s.pnlPct1x !== undefined).reduce((sum: number, s: any) => sum + s.pnlPct1x, 0);
      }
      const winRate = totalTaken > 0 ? Math.round((totalWon / totalTaken) * 10000) / 100 : 0;
      res.json({ totalTaken, totalWon, totalLost, totalPnl: Math.round(totalPnl * 100) / 100, winRate, users: Object.keys(data).length });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/prices', (req, res) => {
    try {
      const cache = loadPriceCache();
      res.json(cache);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  return router;
}
