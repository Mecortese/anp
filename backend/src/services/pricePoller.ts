import https from 'https';
import { signalDb } from './database.js';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
const priceCachePath = path.join(dataDir, 'price_cache.json');
const userSignalsPath = path.join(process.cwd(), 'data', 'user_signals.json');

interface PriceCache {
  [symbol: string]: { price: number; timestamp: number };
}

function loadPriceCache(): PriceCache {
  if (existsSync(priceCachePath)) {
    try { return JSON.parse(readFileSync(priceCachePath, 'utf-8')); }
    catch { return {}; }
  }
  return {};
}

function savePriceCache(cache: PriceCache) {
  writeFileSync(priceCachePath, JSON.stringify(cache, null, 2));
}

export function loadUserSignals(): Record<string, any[]> {
  if (existsSync(userSignalsPath)) {
    try { return JSON.parse(readFileSync(userSignalsPath, 'utf-8')); }
    catch { return {}; }
  }
  return {};
}

function fetchOkxPrice(symbol: string): Promise<number | null> {
  return new Promise((resolve) => {
    const okxSym = symbol.includes('-') ? symbol : `${symbol.slice(0, -4)}-USDT`;
    const path = `/api/v5/market/ticker?instId=${okxSym}`;
    const req = https.request({ hostname: 'www.okx.com', path, method: 'GET' }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(d);
          if (parsed.code === '0' && parsed.data?.[0]?.last) {
            resolve(parseFloat(parsed.data[0].last));
          } else resolve(null);
        } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.end();
  });
}

async function getPrices(symbols: string[]): Promise<PriceCache> {
  const cache = loadPriceCache();
  const now = Date.now();
  const stale = 120000;
  const staleSymbols = symbols.filter(s => !cache[s] || (now - cache[s].timestamp) > stale);
  if (staleSymbols.length === 0) return cache;
  const results = await Promise.all(staleSymbols.map(s => fetchOkxPrice(s).then(p => ({ s, p }))));
  for (const { s, p } of results) {
    if (p !== null) cache[s] = { price: p, timestamp: now };
  }
  savePriceCache(cache);
  return cache;
}

export async function checkOpenSignals() {
  if (!signalDb.initialized) return;
  const openSignals = signalDb.getOpen();
  if (openSignals.length === 0) return;
  const symbols = [...new Set(openSignals.map(s => s.symbol))];
  const prices = await getPrices(symbols);
  let resolved = 0;
  for (const sig of openSignals) {
    const price = prices[sig.symbol]?.price;
    if (price === undefined) continue;
    let hit: 'won' | 'lost' | null = null;
    let exitReason = '';
    if (sig.type === 'long') {
      if (price <= sig.stopLoss) { hit = 'lost'; exitReason = `SL hit $${price}`; }
      else if (price >= sig.takeProfit) { hit = 'won'; exitReason = `TP hit $${price}`; }
    } else {
      if (price >= sig.stopLoss) { hit = 'lost'; exitReason = `SL hit $${price}`; }
      else if (price <= sig.takeProfit) { hit = 'won'; exitReason = `TP hit $${price}`; }
    }
    if (hit) {
      const pnlPct1x = hit === 'won' ? sig.tpPct : -sig.slPct;
      signalDb.updateStatus(sig.id, hit, price, pnlPct1x, exitReason);

      const data = loadUserSignals();
      for (const [userId, signals] of Object.entries(data)) {
        const takenSig = signals.findIndex((s: any) => s.oderId === sig.id && s.action === 'taken');
        if (takenSig !== -1) {
          signals[takenSig] = { ...signals[takenSig], action: hit, pnlPct1x, timestamp: Date.now() };
          if (existsSync(path.join(process.cwd(), 'data'))) {
            writeFileSync(userSignalsPath, JSON.stringify(data, null, 2));
          }
        }
      }
      resolved++;
    }
  }
  if (resolved > 0) console.log(`[AutoCheck] Resolved ${resolved} signals`);
}

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startPricePoller(intervalMs = 300000) {
  if (intervalId) clearInterval(intervalId);
  checkOpenSignals();
  intervalId = setInterval(checkOpenSignals, intervalMs);
  console.log(`[PricePoller] Running every ${intervalMs / 1000}s`);
}

export function stopPricePoller() {
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
}
