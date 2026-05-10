export interface Signal {
  id: string;
  timestamp: number;
  symbol: string;
  type: 'long' | 'short';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  slPct: number;
  tpPct: number;
  confidence: number;
  timeframe: string;
  reason: string;
  strategies?: string;
  rsi?: number;
  macd?: { value: number; signal: number; histogram: number };
  edges?: string[];
  fundingEdge?: boolean;
  liquidityEdge?: boolean;
  structureEdge?: boolean;
  momentumEdge?: boolean;
}

export interface Ticker {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h?: number;
  low24h?: number;
}

export interface Asset {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  lastSignal?: Signal;
}

export interface LeaderboardEntry {
  oderId: string;
  taken: number;
  won: number;
  lost: number;
  pnl: number;
  winRate: number;
  equity?: number;
}

export type WSMessage = {
  type: 'signal' | 'ticker' | 'price' | 'connected';
  payload?: Signal | Ticker | { symbol: string; price: number };
  timestamp: number;
  message?: string;
};