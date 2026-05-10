import type { Kline } from './indicators';
import { getIndicators } from './indicators';
import {
  detectMarketStructure,
  detectLiquidityZones,
  findOrderBlocks,
  calculateConviction,
  determineLeverage,
  determineRiskLevel,
  type TradeSetup,
  type FundingRate
} from './tradingEdges';

const OKX_FUNDING = 'https://www.okx.com/api/v5/public/funding-rate';

export interface FundingCache {
  [symbol: string]: FundingRate;
}

export async function fetchFundingRates(symbols: string[]): Promise<FundingCache> {
  const cache: FundingCache = {};
  for (const sym of symbols) {
    const okxSym = sym.replace('USDT', '-USDT');
    try {
      const resp = await fetch(`${OKX_FUNDING}?instId=${okxSym}`);
      if (!resp.ok) continue;
      const json = await resp.json();
      if (json.code !== '0' || !json.data?.[0]) continue;
      const d = json.data[0];
      cache[sym] = {
        symbol: sym,
        rate: parseFloat(d.fundingRate) * 100,
        nextFundingTime: parseInt(d.nextFundingTime),
        timestamp: Date.now()
      };
    } catch {}
  }
  return cache;
}

export function generateTradeSetup(
  symbol: string,
  klines: Kline[],
  funding: FundingRate | null,
  timeframe: string,
  type: 'long' | 'short'
): TradeSetup | null {
  if (klines.length < 50) return null;

  const indicators = getIndicators(klines);
  const structure = detectMarketStructure(klines);
  const liqZones = detectLiquidityZones(klines);
  const orderBlocks = findOrderBlocks(klines, structure.trend);
  const { score, edges, fundingEdge, structureEdge, liquidityEdge, momentumEdge } = calculateConviction(
    funding, structure, orderBlocks, liqZones,
    indicators.rsi, indicators.macd.histogram, indicators.volumeRatio,
    type, klines[klines.length - 1].close
  );

  if (score < 55) return null;

  const price = klines[klines.length - 1].close;
  const slPct = type === 'long' ? 0.015 : 0.015;
  const tpPct = type === 'long' ? 0.02 : 0.02;

  const entry = price;
  const sl = type === 'long' ? price * (1 - slPct) : price * (1 + slPct);
  const tp = type === 'long' ? price * (1 + tpPct) : price * (1 - tpPct);
  const riskLevel = determineRiskLevel(fundingEdge, structureEdge, liquidityEdge, momentumEdge);
  const leverage = determineLeverage(score, riskLevel);

  const reason = edges.slice(0, 3).join(' + ');

  return {
    symbol,
    type,
    convictionScore: score,
    leverageRecommendation: leverage,
    riskLevel,
    entryPrice: Math.round(entry * 100) / 100,
    stopLoss: Math.round(sl * 100) / 100,
    takeProfit: Math.round(tp * 100) / 100,
    slPct: slPct * 100,
    tpPct: tpPct * 100,
    edges,
    reason,
    timeframe,
    fundingEdge,
    liquidityEdge,
    structureEdge,
    momentumEdge,
    rsi: Math.round(indicators.rsi * 10) / 10,
    macdHistogram: Math.round(indicators.macd.histogram * 1000) / 1000,
    volumeRatio: Math.round(indicators.volumeRatio * 100) / 100,
    timestamp: Date.now()
  };
}

export function evaluateAllSetups(
  klinesMap: Map<string, Kline[]>,
  funding: FundingCache
): TradeSetup[] {
  const setups: TradeSetup[] = [];
  const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT'];

  for (const symbol of symbols) {
    const klines = klinesMap.get(symbol);
    if (!klines || klines.length < 50) continue;

    const fund = funding[symbol] || null;

    const longSetup = generateTradeSetup(symbol, klines, fund, '1h', 'long');
    const shortSetup = generateTradeSetup(symbol, klines, fund, '1h', 'short');

    if (longSetup && (!shortSetup || longSetup.convictionScore > shortSetup.convictionScore)) {
      setups.push(longSetup);
    } else if (shortSetup) {
      setups.push(shortSetup);
    }
  }

  return setups.sort((a, b) => b.convictionScore - a.convictionScore);
}