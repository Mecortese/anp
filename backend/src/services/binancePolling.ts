import axios from 'axios';

const BINANCE_API = 'https://api.binance.com/api/v3/ticker/24hr';

interface TickerData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
}

const SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'DOTUSDT', 'MATICUSDT',
  'LINKUSDT', 'LTCUSDT', 'UNIUSDT', 'ATOMUSDT', 'ETCUSDT',
  'XLMUSDT', 'NEARUSDT', 'ALGOUSDT', 'MKRUSDT', 'AAVEUSDT'
];

export class BinancePolling {
  private interval: NodeJS.Timeout | null = null;
  private onTick: (tickers: TickerData[]) => void;

  constructor(onTick: (tickers: TickerData[]) => void) {
    this.onTick = onTick;
  }

  start(intervalMs = 5000): void {
    console.log('[BinancePolling] Starting HTTP polling every', intervalMs, 'ms');
    this.fetchTickers();
    this.interval = setInterval(() => this.fetchTickers(), intervalMs);
  }

  private async fetchTickers(): Promise<void> {
    try {
      const symbolsParam = SYMBOLS.join(',');
      const response = await axios.get(BINANCE_API, {
        params: { symbols: `[${SYMBOLS.map(s => `"${s}"`).join(',')}]` },
        headers: { 'Accept': 'application/json' }
      });

      const tickers: TickerData[] = response.data.map((item: any) => ({
        symbol: item.symbol,
        price: parseFloat(item.lastPrice),
        change24h: parseFloat(item.priceChangePercent),
        volume24h: parseFloat(item.quoteVolume),
        high24h: parseFloat(item.highPrice),
        low24h: parseFloat(item.lowPrice)
      }));

      this.onTick(tickers);
    } catch (error) {
      console.error('[BinancePolling] Error fetching tickers:', error);
    }
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('[BinancePolling] Stopped');
    }
  }
}