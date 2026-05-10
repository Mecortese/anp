export interface Kline {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Indicators {
  rsi: number;
  macd: { value: number; signal: number; histogram: number };
  emaFast: number;
  emaSlow: number;
  emaSignal: number;
  bollinger: { upper: number; middle: number; lower: number };
  atr: number;
  volumeRatio: number;
  trend: 'up' | 'down' | 'neutral';
  support: number;
  resistance: number;
  momentum: number;
}

export function calculateEMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0;
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  return ema;
}

export function calculateSMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0;
  return data.slice(data.length - period).reduce((a, b) => a + b, 0) / period;
}

export function calculateRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function calculateMACD(closes: number[], fast = 12, slow = 26, signal = 9) {
  const emaFast = calculateEMA(closes, fast);
  const emaSlow = calculateEMA(closes, slow);
  const macdLine = emaFast - emaSlow;
  const macdHistory: number[] = [];
  for (let i = slow; i < closes.length; i++) {
    const f = calculateEMA(closes.slice(0, i + 1), fast);
    const s = calculateEMA(closes.slice(0, i + 1), slow);
    macdHistory.push(f - s);
  }
  const signalLine = calculateEMA(macdHistory, signal);
  const histogram = macdLine - signalLine;
  return { value: macdLine, signal: signalLine, histogram };
}

export function calculateBollingerBands(closes: number[], period = 20, stdDev = 2): { upper: number; middle: number; lower: number } {
  const sma = calculateSMA(closes, period);
  const recent = closes.slice(closes.length - period);
  const variance = recent.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period;
  const std = Math.sqrt(variance);
  return { upper: sma + std * stdDev, middle: sma, lower: sma - std * stdDev };
}

export function calculateATR(klines: Kline[], period = 14): number {
  if (klines.length < period + 1) return 0;
  const trs: number[] = [];
  for (let i = 1; i < klines.length; i++) {
    const high = klines[i].high;
    const low = klines[i].low;
    const prevClose = klines[i - 1].close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trs.push(tr);
  }
  return trs.slice(trs.length - period).reduce((a, b) => a + b, 0) / period;
}

export function calculateVolumeRatio(volumes: number[], period = 20): number {
  if (volumes.length < period) return 1;
  const avg = volumes.slice(volumes.length - period).reduce((a, b) => a + b, 0) / period;
  const current = volumes[volumes.length - 1];
  return current / avg;
}

export function detectSupportResistance(klines: Kline[], lookback = 50): { support: number; resistance: number } {
  const lows = klines.slice(-lookback).map(k => k.low);
  const highs = klines.slice(-lookback).map(k => k.high);
  const currentClose = klines[klines.length - 1].close;

  const support = Math.min(...lows.slice(0, -1));
  const resistance = Math.max(...highs.slice(0, -1));

  return { support, resistance };
}

export function detectTrend(closes: number[], emaFast: number, emaSlow: number): 'up' | 'down' | 'neutral' {
  if (closes.length < 50) return 'neutral';
  const currentClose = closes[closes.length - 1];
  const ema200 = calculateEMA(closes, 200);
  if (currentClose > ema200 && emaFast > emaSlow) return 'up';
  if (currentClose < ema200 && emaFast < emaSlow) return 'down';
  return 'neutral';
}

export function detectMomentum(closes: number[], period = 10): number {
  if (closes.length < period + 1) return 0;
  const recent = closes.slice(-period);
  return ((recent[recent.length - 1] - recent[0]) / recent[0]) * 100;
}

export function getIndicators(klines: Kline[]): Indicators {
  if (klines.length < 200) {
    return {
      rsi: 50, macd: { value: 0, signal: 0, histogram: 0 },
      emaFast: 0, emaSlow: 0, emaSignal: 0,
      bollinger: { upper: 0, middle: 0, lower: 0 },
      atr: 0, volumeRatio: 1, trend: 'neutral',
      support: 0, resistance: 0, momentum: 0
    };
  }

  const closes = klines.map(k => k.close);
  const volumes = klines.map(k => k.volume);

  const rsi = calculateRSI(closes);
  const macd = calculateMACD(closes);
  const emaFast = calculateEMA(closes, 9);
  const emaSlow = calculateEMA(closes, 21);
  const emaSignal = calculateEMA(closes, 50);
  const bollinger = calculateBollingerBands(closes);
  const atr = calculateATR(klines);
  const volumeRatio = calculateVolumeRatio(volumes);
  const trend = detectTrend(closes, emaFast, emaSlow);
  const { support, resistance } = detectSupportResistance(klines);
  const momentum = detectMomentum(closes);

  return { rsi, macd, emaFast, emaSlow, emaSignal, bollinger, atr, volumeRatio, trend, support, resistance, momentum };
}

export interface StrategySignal {
  name: string;
  type: 'long' | 'short';
  confidence: number;
  reason: string;
  price: number;
  sl: number;
  tp: number;
  slPct: number;
  tpPct: number;
}

export function evaluateStrategies(klines: Kline[], indicators: Indicators): StrategySignal[] {
  const signals: StrategySignal[] = [];
  const k = klines[klines.length - 1];
  const { rsi, macd, emaFast, emaSlow, emaSignal, bollinger, atr, volumeRatio, trend, support, resistance, momentum } = indicators;
  const macdValue = macd.value, macdSignal = macd.signal, macdHistogram = macd.histogram;
  const bollingerUpper = bollinger.upper, bollingerMiddle = bollinger.middle, bollingerLower = bollinger.lower;
  const price = k.close;
  const slPct = 0.02;
  const tpPct = 0.02;

  if (rsi < 30 && macd.histogram > 0) {
    signals.push({
      name: 'RSI_BOTTOM_REVERSAL',
      type: 'long',
      confidence: Math.min(95, 70 + (30 - rsi) * 1.5),
      reason: `RSI oversold (${rsi.toFixed(1)}), MACD histogram turning positive`,
      price, sl: price * (1 - slPct), tp: price * (1 + tpPct), slPct, tpPct
    });
  }

  if (rsi > 70 && macd.histogram < 0) {
    signals.push({
      name: 'RSI_TOP_REVERSAL',
      type: 'short',
      confidence: Math.min(95, 70 + (rsi - 70) * 1.5),
      reason: `RSI overbought (${rsi.toFixed(1)}), MACD histogram turning negative`,
      price, sl: price * (1 + slPct), tp: price * (1 - tpPct), slPct, tpPct
    });
  }

  const macdPrev = calculateMACD(klines.slice(0, -1).map(k => k.close));
  if (macd.histogram > 0 && macdPrev.histogram <= 0 && volumeRatio > 1.2) {
    signals.push({
      name: 'MACD_CROSS_UP',
      type: 'long',
      confidence: Math.min(90, 60 + volumeRatio * 10),
      reason: `MACD bullish crossover, volume spike (${volumeRatio.toFixed(2)}x avg)`,
      price, sl: price * (1 - slPct), tp: price * (1 + tpPct), slPct, tpPct
    });
  }
  if (macd.histogram < 0 && macdPrev.histogram >= 0 && volumeRatio > 1.2) {
    signals.push({
      name: 'MACD_CROSS_DOWN',
      type: 'short',
      confidence: Math.min(90, 60 + volumeRatio * 10),
      reason: `MACD bearish crossover, volume spike (${volumeRatio.toFixed(2)}x avg)`,
      price, sl: price * (1 + slPct), tp: price * (1 - tpPct), slPct, tpPct
    });
  }

  const bbWidth = (bollinger.upper - bollinger.lower) / bollinger.middle;
  if (price > bollinger.upper && bbWidth > 0.03 && trend === 'up') {
    signals.push({
      name: 'BOLLINGER_BREAKOUT_LONG',
      type: 'long',
      confidence: 75 + volumeRatio * 5,
      reason: `Price broke above upper BB, trend up, volume ${volumeRatio.toFixed(2)}x`,
      price, sl: price * (1 - slPct), tp: price * (1 + tpPct), slPct, tpPct
    });
  }
  if (price < bollinger.lower && bbWidth > 0.03 && trend === 'down') {
    signals.push({
      name: 'BOLLINGER_BREAKOUT_SHORT',
      type: 'short',
      confidence: 75 + volumeRatio * 5,
      reason: `Price broke below lower BB, trend down, volume ${volumeRatio.toFixed(2)}x`,
      price, sl: price * (1 + slPct), tp: price * (1 - tpPct), slPct, tpPct
    });
  }

  if (price > emaSlow && emaFast > emaSlow && momentum > 1 && volumeRatio > 1.3) {
    signals.push({
      name: 'EMA_MOMENTUM_LONG',
      type: 'long',
      confidence: 65 + momentum * 3 + volumeRatio * 5,
      reason: `EMA crossover bullish, momentum +${momentum.toFixed(2)}%, volume ${volumeRatio.toFixed(2)}x`,
      price, sl: price * (1 - slPct), tp: price * (1 + tpPct), slPct, tpPct
    });
  }
  if (price < emaSlow && emaFast < emaSlow && momentum < -1 && volumeRatio > 1.3) {
    signals.push({
      name: 'EMA_MOMENTUM_SHORT',
      type: 'short',
      confidence: 65 + Math.abs(momentum) * 3 + volumeRatio * 5,
      reason: `EMA crossover bearish, momentum ${momentum.toFixed(2)}%, volume ${volumeRatio.toFixed(2)}x`,
      price, sl: price * (1 + slPct), tp: price * (1 - tpPct), slPct, tpPct
    });
  }

  if (price > resistance && volumeRatio > 1.5) {
    signals.push({
      name: 'RESISTANCE_BREAK_LONG',
      type: 'long',
      confidence: 70 + volumeRatio * 5,
      reason: `Broke resistance $${resistance.toFixed(2)}, high volume ${volumeRatio.toFixed(2)}x`,
      price, sl: resistance, tp: price * (1 + tpPct), slPct, tpPct
    });
  }
  if (price < support && volumeRatio > 1.5) {
    signals.push({
      name: 'SUPPORT_BREAK_SHORT',
      type: 'short',
      confidence: 70 + volumeRatio * 5,
      reason: `Broke support $${support.toFixed(2)}, high volume ${volumeRatio.toFixed(2)}x`,
      price, sl: support, tp: price * (1 - tpPct), slPct, tpPct
    });
  }

  return signals;
}
