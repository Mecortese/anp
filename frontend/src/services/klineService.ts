import type { Kline } from './indicators';

const OKX = 'https://www.okx.com/api/v5/market';

export const SYMBOLS = ['BTC-USDT', 'ETH-USDT', 'BNB-USDT', 'SOL-USDT', 'XRP-USDT', 'ADA-USDT', 'DOGE-USDT', 'AVAX-USDT', 'DOT-USDT', 'LINK-USDT'];

const SYMBOL_MAP: Record<string, string> = {
  'BTC-USDT': 'BTCUSDT',
  'ETH-USDT': 'ETHUSDT',
  'BNB-USDT': 'BNBUSDT',
  'SOL-USDT': 'SOLUSDT',
  'XRP-USDT': 'XRPUSDT',
  'ADA-USDT': 'ADAUSDT',
  'DOGE-USDT': 'DOGEUSDT',
  'AVAX-USDT': 'AVAXUSDT',
  'DOT-USDT': 'DOTUSDT',
  'LINK-USDT': 'LINKUSDT',
};

const INTERVAL_MAP: Record<string, string> = {
  '1h': '1H',
  '4h': '4H',
};

export async function fetchHistoricalKlines(symbol: string, interval: string, limit = 200): Promise<Kline[]> {
  const bar = INTERVAL_MAP[interval] || '1H';
  const url = `${OKX}/history-candles?instId=${symbol}&bar=${bar}&limit=${limit}`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();

    if (json.code !== '0' || !json.data) {
      throw new Error(json.msg || 'Bad response');
    }

    const data = json.data as string[][];
    console.log(`[Kline] ${symbol} ${interval}: ${data.length} candles from OKX`);
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
    if (klines.length > 0) {
      map.set(SYMBOL_MAP[symbol], klines);
    }
  }
  console.log(`[Kline] Loaded ${map.size}/${SYMBOLS.length} for ${interval}`);
  return map;
}

export function subscribeToKlines(callback: (symbol: string, timeframe: string, kline: Kline) => void) {
  console.log('[WS] Using OKX REST polling for klines');
}

export function disconnect() {}
