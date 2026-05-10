import type { Kline } from './indicators';

export interface FundingRate {
  symbol: string;
  rate: number;
  nextFundingTime: number;
  timestamp: number;
}

export interface LiquidityZone {
  high: number;
  low: number;
  volume: number;
  touchCount: number;
}

export interface MarketStructure {
  trend: 'bull' | 'bear' | 'range';
  swingHigh: number;
  swingLow: number;
  brokenStructure: boolean;
  lastBreakTime: number;
}

export interface OrderBlock {
  high: number;
  low: number;
  volume: number;
  timeframe: string;
  age: number;
  bullish: boolean;
}

export interface TradeSetup {
  symbol: string;
  type: 'long' | 'short';
  convictionScore: number;
  leverageRecommendation: 1 | 2 | 3 | 5;
  riskLevel: 'low' | 'medium' | 'high';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  slPct: number;
  tpPct: number;
  edges: string[];
  reason: string;
  timeframe: string;
  fundingEdge: boolean;
  liquidityEdge: boolean;
  structureEdge: boolean;
  momentumEdge: boolean;
  rsi: number;
  macdHistogram: number;
  volumeRatio: number;
  timestamp: number;
}

export function detectMarketStructure(klines: Kline[]): MarketStructure {
  if (klines.length < 50) {
    return { trend: 'range', swingHigh: 0, swingLow: 0, brokenStructure: false, lastBreakTime: 0 };
  }

  const highs = klines.slice(-20).map(k => k.high);
  const lows = klines.slice(-20).map(k => k.low);
  const closes = klines.map(k => k.close);

  const swingHigh = Math.max(...highs);
  const swingLow = Math.min(...lows);
  const currentClose = closes[closes.length - 1];

  const sma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const sma50 = closes.length >= 50 ? closes.slice(-50).reduce((a, b) => a + b, 0) / 50 : sma20;

  let brokenStructure = false;
  let lastBreakTime = 0;

  if (currentClose < swingLow * 0.98 || currentClose > swingHigh * 1.02) {
    brokenStructure = true;
    lastBreakTime = Date.now();
  }

  let trend: 'bull' | 'bear' | 'range' = 'range';
  if (currentClose > sma20 && sma20 > sma50 && currentClose > swingHigh * 0.95) {
    trend = 'bull';
  } else if (currentClose < sma20 && sma20 < sma50 && currentClose < swingHigh * 1.05) {
    trend = 'bear';
  }

  return { trend, swingHigh, swingLow, brokenStructure, lastBreakTime };
}

export function detectLiquidityZones(klines: Kline[], lookback = 100): LiquidityZone[] {
  if (klines.length < lookback) return [];

  const zones: LiquidityZone[] = [];
  const recent = klines.slice(-lookback);

  for (const k of recent) {
    if (k.volume > 5000000) {
      zones.push({ high: k.high, low: k.low, volume: k.volume, touchCount: 0 });
    }
  }

  const consolidated = consolidateZones(zones);
  return consolidated.slice(0, 5);
}

function consolidateZones(zones: LiquidityZone[]): LiquidityZone[] {
  if (zones.length === 0) return [];

  const sorted = [...zones].sort((a, b) => b.volume - a.volume);
  const merged: { high: number; low: number; volume: number }[] = [];

  for (const zone of sorted) {
    const existing = merged.find(m =>
      (zone.high >= m.low && zone.high <= m.high * 1.005) ||
      (zone.low <= m.high && zone.low >= m.low * 0.995)
    );
    if (existing) {
      existing.high = Math.max(existing.high, zone.high);
      existing.low = Math.min(existing.low, zone.low);
      existing.volume += zone.volume;
    } else {
      merged.push({ high: zone.high, low: zone.low, volume: zone.volume });
    }
  }

  return merged.sort((a, b) => b.volume - a.volume).map(m => ({
    high: m.high, low: m.low, volume: m.volume, touchCount: 0
  }));
}

export function findOrderBlocks(klines: Kline[], trend: 'bull' | 'bear' | 'range'): OrderBlock[] {
  if (klines.length < 50) return [];

  const blocks: OrderBlock[] = [];
  const candles = klines.slice(-100);

  for (let i = 10; i < candles.length - 5; i++) {
    const c = candles[i];
    const next5 = candles.slice(i + 1, i + 6);
    const next5TrendedDown = next5.every(nc => nc.close < nc.open * 1.005) && next5.every(nc => nc.close < c.close);
    const next5TrendedUp = next5.every(nc => nc.close > nc.open * 0.995) && next5.every(nc => nc.close > c.close);

    if (trend === 'bull' && c.close > c.open * 1.005 && next5TrendedDown && c.close > candles[i - 1].close) {
      blocks.push({ high: c.high, low: c.low, volume: c.volume, timeframe: '1h', age: candles.length - i, bullish: true });
    }
    if (trend === 'bear' && c.close < c.open * 0.995 && next5TrendedUp && c.close < candles[i - 1].close) {
      blocks.push({ high: c.high, low: c.low, volume: c.volume, timeframe: '1h', age: candles.length - i, bullish: false });
    }
  }

  return blocks.slice(-5);
}

export function calculateConviction(
  fundingRate: FundingRate | null,
  structure: MarketStructure,
  orderBlocks: OrderBlock[],
  liquidityZones: LiquidityZone[],
  rsi: number,
  macdHistogram: number,
  volumeRatio: number,
  type: 'long' | 'short',
  close: number
): { score: number; edges: string[]; fundingEdge: boolean; structureEdge: boolean; liquidityEdge: boolean; momentumEdge: boolean } {
  let score = 50;
  const edges: string[] = [];
  let fundingEdge = false, structureEdge = false, liquidityEdge = false, momentumEdge = false;

  if (fundingRate) {
    if (type === 'long' && fundingRate.rate < -0.03) {
      score += 25; edges.push('Funding Rate Short Squeeze'); fundingEdge = true;
    }
    if (type === 'short' && fundingRate.rate > 0.03) {
      score += 25; edges.push('Funding Rate Long Squeeze'); fundingEdge = true;
    }
    if (Math.abs(fundingRate.rate) < 0.005) {
      score += 5; edges.push('Low Funding Neutral');
    }
  }

  if (structure.trend === 'bull' && type === 'long') {
    score += 15; edges.push('Market Structure Bull'); structureEdge = true;
  }
  if (structure.trend === 'bear' && type === 'short') {
    score += 15; edges.push('Market Structure Bear'); structureEdge = true;
  }
  if (structure.brokenStructure && type === 'long' && structure.trend === 'bull') {
    score += 10; edges.push('Structure Break Long'); structureEdge = true;
  }

  const nearestOB = orderBlocks.find(ob => ob.bullish === (type === 'long') && ob.age < 20);
  if (nearestOB && close >= nearestOB.low * 0.98 && close <= nearestOB.high * 1.02) {
    score += 15; edges.push('Order Block Rejection'); liquidityEdge = true;
  }

  if (type === 'long' && rsi < 35) {
    score += 10; edges.push('RSI Oversold'); momentumEdge = true;
  }
  if (type === 'short' && rsi > 65) {
    score += 10; edges.push('RSI Overbought'); momentumEdge = true;
  }
  if (macdHistogram > 0 && type === 'long') {
    score += 8; edges.push('MACD Bullish'); momentumEdge = true;
  }
  if (macdHistogram < 0 && type === 'short') {
    score += 8; edges.push('MACD Bearish'); momentumEdge = true;
  }
  if (volumeRatio > 1.5) {
    score += 5; edges.push(`High Volume ${volumeRatio.toFixed(1)}x`); momentumEdge = true;
  }

  if (structure.trend === 'range' && type === 'long' && close < structure.swingLow * 1.02) {
    score += 12; edges.push('Range Support Long'); structureEdge = true;
  }
  if (structure.trend === 'range' && type === 'short' && close > structure.swingHigh * 0.98) {
    score += 12; edges.push('Range Resistance Short'); structureEdge = true;
  }

  score = Math.max(0, Math.min(100, score));

  return { score, edges, fundingEdge, structureEdge, liquidityEdge, momentumEdge };
}

export function determineLeverage(score: number, riskLevel: 'low' | 'medium' | 'high'): 1 | 2 | 3 | 5 {
  if (score >= 85) return 5;
  if (score >= 70) return 3;
  if (score >= 55) return 2;
  return 1;
}

export function determineRiskLevel(
  fundingEdge: boolean,
  structureEdge: boolean,
  liquidityEdge: boolean,
  momentumEdge: boolean
): 'low' | 'medium' | 'high' {
  const edges = [fundingEdge, structureEdge, liquidityEdge, momentumEdge].filter(Boolean).length;
  if (edges >= 4) return 'high';
  if (edges >= 2) return 'medium';
  return 'low';
}