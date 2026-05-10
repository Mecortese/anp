import express from 'express';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
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

export function userSignalsRouter() {
  const router = express.Router();

  router.post('/user/signals', (req, res) => {
    try {
      const { oderId, userId, action, pnlPct1x, timestamp } = req.body;
      if (!userId || !action) { res.status(400).json({ error: 'userId and action required' }); return; }
      if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
      const data = loadUserSignals();
      if (!data[userId]) data[userId] = [];
      data[userId].push({ oderId, action, pnlPct1x, timestamp });
      if (data[userId].length > 500) data[userId] = data[userId].slice(-500);
      saveUserSignals(data);
      res.json({ ok: true });
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
        return { oderId: userId.slice(0, 12) + '...', taken, won, lost, pnl: Math.round(pnl * 100) / 100, winRate };
      });
      const sorted = entries.sort((a, b) => {
        if (b.pnl !== a.pnl) return b.pnl - a.pnl;
        return b.taken - a.taken;
      });
      res.json(sorted.slice(0, 50));
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  return router;
}
