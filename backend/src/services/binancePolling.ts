import axios from 'axios';

const BINANCE_API = 'https://api.binance.com/api/v3/ticker/24hr';

const SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'DOTUSDT', 'MATICUSDT',
  'LINKUSDT', 'LTCUSDT', 'ATOMUSDT', 'UNIUSDT', 'ETCUSDT'
];

interface TickerData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
}

let cachedTickers: TickerData[] = [];
let lastUpdate = 0;
let pollingError = '';
let fetchInProgress = false;

export async function fetchTickers(): Promise<TickerData[]> {
  if (fetchInProgress) return cachedTickers;
  fetchInProgress = true;
  
  try {
    const results: TickerData[] = [];
    
    for (const symbol of SYMBOLS) {
      try {
        const response = await axios.get(BINANCE_API, {
          params: { symbol },
          timeout: 5000
        });
        
        const data = response.data;
        results.push({
          symbol: data.symbol,
          name: data.symbol.replace('USDT', ''),
          price: parseFloat(data.lastPrice) || 0,
          change24h: parseFloat(data.priceChangePercent) || 0,
          volume24h: parseFloat(data.quoteVolume) || 0
        });
      } catch (e: any) {
        console.error(`[Polling] Error fetching ${symbol}:`, e?.message || e);
      }
    }
    
    cachedTickers = results;
    lastUpdate = Date.now();
    pollingError = '';
    console.log(`[Polling] Got ${results.length} tickers at ${new Date().toISOString()}`);
    return cachedTickers;
  } catch (error: any) {
    pollingError = error.message;
    console.error('[Polling] Error:', error.message);
    return cachedTickers;
  } finally {
    fetchInProgress = false;
  }
}

export function getTickers(): TickerData[] {
  return cachedTickers;
}

export function getPollingStatus() {
  return {
    lastUpdate,
    error: pollingError,
    count: cachedTickers.length
  };
}

export async function startPolling(intervalMs = 15000): Promise<void> {
  console.log('[Polling] Starting with interval:', intervalMs);
  await fetchTickers();
  setInterval(fetchTickers, intervalMs);
}