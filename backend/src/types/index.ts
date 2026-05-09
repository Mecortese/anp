export interface Kline {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Indicator {
  name: string;
  value: number;
  signal?: 'bullish' | 'bearish' | 'neutral';
}

export interface TechnicalIndicators {
  rsi: number;
  macd: { value: number; signal: number; histogram: number };
  ema_fast: number;
  ema_slow: number;
  ema_signal: number;
  bollinger: { upper: number; middle: number; lower: number };
  atr: number;
}

export interface Signal {
  id: string;
  timestamp: number;
  symbol: string;
  type: 'long' | 'short';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  timeframe: string;
  indicators: TechnicalIndicators;
  reason: string;
}

export interface Asset {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  lastSignal?: Signal;
}

export interface MarketData {
  symbol: string;
  kline: Kline;
  indicators: TechnicalIndicators;
  signals: Signal[];
}