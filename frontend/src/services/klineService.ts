import type { Kline } from './indicators';

const BINANCE_WS = 'wss://stream.binance.com:9443/ws';
const BINANCE_REST = 'https://api.binance.com/api/v3';

export const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT'];
export const TIMEFRAMES = ['1h', '4h'];

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export interface KlineCallback {
  (symbol: string, timeframe: string, kline: Kline): void;
}

let onKline: KlineCallback | null = null;

export function subscribeToKlines(callback: KlineCallback) {
  onKline = callback;
  connect();
}

function connect() {
  if (ws) ws.close();

  const streams = SYMBOLS.flatMap(s =>
    [`${s.toLowerCase()}@kline_1m`, `${s.toLowerCase()}@kline_1h`, `${s.toLowerCase()}@kline_4h`]
  ).join('/');

  ws = new WebSocket(`${BINANCE_WS}/${streams}`);

  ws.onopen = () => {
    console.log('[WS] Connected to Binance WebSocket');
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.e === 'kline' && msg.k) {
        const k = msg.k;
        const symbol = k.s;
        const tf = k.i as string;
        const timeframe = tf === '1m' ? '1h' : tf;

        if (onKline && (timeframe === '1h' || timeframe === '4h')) {
          onKline(symbol, timeframe, {
            time: k.t,
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: parseFloat(k.c),
            volume: parseFloat(k.v)
          });
        }
      }
    } catch {}
  };

  ws.onerror = () => {
    console.warn('[WS] Error, retrying in 5s...');
  };

  ws.onclose = () => {
    if (!reconnectTimer) {
      reconnectTimer = setTimeout(connect, 5000);
    }
  };
}

export function disconnect() {
  if (ws) { ws.close(); ws = null; }
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
}

export async function fetchHistoricalKlines(symbol: string, interval: string, limit = 200): Promise<Kline[]> {
  try {
    const url = `${BINANCE_REST}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    return data.map((k: any[]) => ({
      time: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5])
    }));
  } catch (err) {
    console.error(`[Kline] Failed to fetch ${symbol} ${interval}:`, err);
    return [];
  }
}

export async function fetchAllKlines(interval: string, limit = 200): Promise<Map<string, Kline[]>> {
  const map = new Map<string, Kline[]>();
  const promises = SYMBOLS.map(async (symbol) => {
    const klines = await fetchHistoricalKlines(symbol, interval, limit);
    if (klines.length > 0) map.set(symbol, klines);
  });
  await Promise.all(promises);
  return map;
}
