import type { Kline } from './indicators';

const BINANCE_WS = 'wss://stream.binance.com:9443/ws';
const BINANCE_TESTNET = 'https://testnet.binance.vision/api';

export const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT'];
export const TIMEFRAMES = ['1h', '4h'];

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let klineCount = 0;

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
    [`${s.toLowerCase()}@kline_1h`, `${s.toLowerCase()}@kline_4h`]
  ).join('/');

  console.log('[WS] Connecting to Binance WebSocket...');
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
        const timeframe = k.i as string;

        if (onKline && (timeframe === '1h' || timeframe === '4h')) {
          klineCount++;
          if (klineCount % 20 === 0) console.log(`[WS] Klines: ${klineCount}, last: ${symbol} ${timeframe}`);
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

  ws.onerror = () => console.warn('[WS] Error');
  ws.onclose = () => {
    if (!reconnectTimer) reconnectTimer = setTimeout(connect, 5000);
  };
}

export function disconnect() {
  if (ws) { ws.close(); ws = null; }
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
}

export async function fetchHistoricalKlines(symbol: string, interval: string, limit = 200): Promise<Kline[]> {
  try {
    const resp = await fetch(`${BINANCE_TESTNET}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data: any[][] = await resp.json();
    console.log(`[Kline] ${symbol} ${interval}: ${data.length} klines`);
    return data.map(k => ({
      time: k[0] as number,
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5])
    }));
  } catch (err) {
    console.error(`[Kline] Failed: ${symbol} ${interval}:`, err);
    return [];
  }
}

export async function fetchAllKlines(interval: string, limit = 200): Promise<Map<string, Kline[]>> {
  const map = new Map<string, Kline[]>();
  for (const symbol of SYMBOLS) {
    const klines = await fetchHistoricalKlines(symbol, interval, limit);
    if (klines.length > 0) {
      map.set(symbol, klines);
      console.log(`[Kline] ${symbol} ${interval}: ${klines.length} klines loaded`);
    }
  }
  console.log(`[Kline] Total loaded: ${map.size}/${SYMBOLS.length} for ${interval}`);
  return map;
}
