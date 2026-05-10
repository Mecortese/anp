import express from 'express';
import { signalDb } from '../services/database.js';

export function signalsRouter() {
  const router = express.Router();

  router.get('/signals/closed', (req, res) => {
    try {
      const limit = parseInt(String(req.query.limit || '50'));
      const symbol = req.query.symbol as string | undefined;
      const tf = req.query.timeframe as string | undefined;
      const status = req.query.status as string | undefined;
      const symbols = (req.query.symbols as string || '').split(',').filter(Boolean);

      let all = signalDb.getAll(500);
      all = all.filter(s => s.status === 'won' || s.status === 'lost');

      if (symbol) all = all.filter(s => s.symbol === symbol);
      if (tf) all = all.filter(s => s.timeframe === tf);
      if (status === 'won') all = all.filter(s => s.status === 'won');
      if (status === 'lost') all = all.filter(s => s.status === 'lost');
      if (symbols.length > 0) all = all.filter(s => symbols.includes(s.symbol));

      const result = all.slice(0, limit).map(s => ({
        id: s.id,
        timestamp: s.timestamp,
        closedAt: s.closedAt,
        symbol: s.symbol,
        type: s.type,
        entryPrice: s.entryPrice,
        stopLoss: s.stopLoss,
        takeProfit: s.takeProfit,
        slPct: s.slPct,
        tpPct: s.tpPct,
        closedPrice: s.closedPrice,
        status: s.status,
        pnlPct1x: s.pnlPct1x,
        exitReason: s.exitReason,
        timeframe: s.timeframe,
        reason: s.reason,
        strategies: s.strategies,
        rsi: s.rsi,
        macdHistogram: s.macdHistogram,
        confidence: s.confidence,
        ageHours: s.closedAt ? Math.round((s.closedAt - s.timestamp) / 3600000 * 10) / 10 : null,
      }));

      res.json(result);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/signals/stats', (req, res) => res.json(signalDb.getStats()));
  router.get('/signals', (req, res) => res.json(signalDb.getAll(parseInt(String(req.query.limit || '100')))));
  router.get('/signals/open', (req, res) => res.json(signalDb.getOpen()));

  router.post('/signals', (req, res) => {
    try { signalDb.save(req.body); res.json({ ok: true }); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.put('/signals/:id', (req, res) => {
    try {
      const { status, closedPrice, pnlPct1x, exitReason } = req.body;
      if (status && closedPrice !== undefined) {
        signalDb.updateStatus(req.params.id, status, closedPrice, pnlPct1x, exitReason);
      }
      res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/signals/export/csv', (req, res) => {
    try {
      const signals = signalDb.getAll(1000);
      const headers = ['ID', 'Fecha', 'Symbol', 'Tipo', 'Entry', 'SL', 'TP', 'SL%', 'TP%', 'Confianza', 'Timeframe', 'Raz&#243;n', 'Estado', 'Closed_At', 'Closed_Price', 'P&L_1x', 'Exit_Reason'].join(',');
      const rows = signals.map(s => [
        s.id, new Date(s.timestamp).toISOString(), s.symbol, s.type,
        s.entryPrice, s.stopLoss, s.takeProfit, s.slPct, s.tpPct,
        s.confidence, s.timeframe, `"${(s.reason||'').replace(/"/g,'""')}"`, s.status,
        s.closedAt ? new Date(s.closedAt).toISOString() : '',
        s.closedPrice || '', s.pnlPct1x || '', `"${(s.exitReason||'').replace(/"/g,'""')}"`
      ].join(','));
      const csv = [headers, ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="signals_${new Date().toISOString().slice(0,10)}.csv"`);
      res.send(csv);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  return router;
}
