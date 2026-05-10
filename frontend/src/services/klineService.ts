import type { Kline } from './indicators';

const BACKEND = 'https://crypto-signals-idfn.onrender.com';

const OKX_SYMBOLS: Record<string, string> = {
  'BTCUSDT': 'BTC-USDT', 'ETHUSDT': 'ETH-USDT', 'BNBUSDT': 'BNB-USDT',
  'SOLUSDT': 'SOL-USDT', 'XRPUSDT': 'XRP-USDT', 'ADAUSDT': 'ADA-USDT',
  'DOGEUSDT': 'DOGE-USDT', 'AVAXUSDT': 'AVAX-USDT', 'DOTUSDT': 'DOT-USDT',
  'LINKUSDT': 'LINK-USDT',
};
export const SYMBOLS = Object.keys(OKX_SYMBOLS);

export async function fetchHistoricalKlines(symbol: string, interval: string, limit = 200): Promise<Kline[]> {
  const okxSymbol = OKX_SYMBOLS[symbol];
  if (!okxSymbol) return [];
  const bar = interval === '4h' ? '4H' : '1H';
  const url = `${BACKEND}/api/klines?symbol=${okxSymbol}&interval=${bar}&limit=${limit}`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data: string[][] = await resp.json();
    console.log(`[Kline] ${symbol} ${interval}: ${data.length} candles via Render`);
    return data.map(k => ({
      time: parseInt(k[0]),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5])
    })).reverse();
  } catch (err) {
    console.error(`[Kline] Failed ${symbol} ${interval}:`, err);
    return [];
  }
}

export async function fetchAllKlines(interval: string, limit = 200): Promise<Map<string, Kline[]>> {
  const map = new Map<string, Kline[]>();
  for (const symbol of SYMBOLS) {
    const klines = await fetchHistoricalKlines(symbol, interval, limit);
    if (klines.length > 0) map.set(symbol, klines);
  }
  console.log(`[Kline] Loaded ${map.size}/${SYMBOLS.length} for ${interval}`);
  return map;
}

export function subscribeToKlines(callback: (symbol: string, timeframe: string, kline: Kline) => void) {
  console.log('[WS] Using Render backend proxy for klines');
}

export function disconnect() {}