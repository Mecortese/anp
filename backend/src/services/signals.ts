import { EventEmitter } from 'events';
import type { Signal, Kline, TechnicalIndicators, Asset } from '../types/index.js';
import { TechnicalAnalyzer } from './indicators.js';
import { BinanceWebSocket, SYMBOLS } from './binance.js';

interface SignalConfig {
  minRSI: number;
  maxRSI: number;
  minConfidence: number;
  atrMultiplier: number;
}

const DEFAULT_CONFIG: SignalConfig = {
  minRSI: 25,
  maxRSI: 75,
  minConfidence: 65,
  atrMultiplier: 1.5
};

interface KlineStore {
  [symbol: string]: {
    [timeframe: string]: Kline[];
  };
}

interface SignalHistory {
  [symbol: string]: {
    lastSignal: number;
    signalType: 'long' | 'short' | null;
  };
}

export class SignalEngine extends EventEmitter {
  private ws: BinanceWebSocket;
  private klines: KlineStore = {};
  private signalHistory: SignalHistory = {};
  private config: SignalConfig;
  private signalCooldown = 30 * 60 * 1000;

  constructor(config: Partial<SignalConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ws = new BinanceWebSocket([...SYMBOLS.CRYPTO]);
  }

  start(): void {
    console.log('[SignalEngine] Starting...');
    
    this.ws.on('kline', (symbol: string, timeframe: string, kline: Kline) => {
      this.handleKline(symbol, timeframe, kline);
    });

    this.ws.on('ticker', (ticker: any) => {
      this.emit('ticker', ticker);
    });

    this.ws.connect();
    console.log('[SignalEngine] Connected to Binance WebSocket');
  }

  private handleKline(symbol: string, timeframe: string, kline: Kline): void {
    if (!this.klines[symbol]) {
      this.klines[symbol] = {};
    }
    if (!this.klines[symbol][timeframe]) {
      this.klines[symbol][timeframe] = [];
    }

    const klines = this.klines[symbol][timeframe];
    const lastKline = klines[klines.length - 1];

    if (lastKline && lastKline.time === kline.time) {
      klines[klines.length - 1] = kline;
    } else {
      klines.push(kline);
      if (klines.length > 200) {
        klines.shift();
      }

      if (kline.x && this.shouldAnalyze(timeframe)) {
        this.analyzeAndEmit(symbol, timeframe, kline);
      }
    }
  }

  private shouldAnalyze(timeframe: string): boolean {
    return ['1m', '5m', '15m', '1h', '4h', '1d'].includes(timeframe);
  }

  private analyzeAndEmit(symbol: string, timeframe: string, kline: Kline): void {
    const klines = this.klines[symbol][timeframe];
    const indicators = TechnicalAnalyzer.calculateAll(klines);
    
    if (!indicators) return;

    const signal = this.detectSignal(symbol, timeframe, kline, indicators);
    if (signal) {
      this.emit('signal', signal);
    }
  }

  private detectSignal(
    symbol: string,
    timeframe: string,
    kline: Kline,
    indicators: TechnicalIndicators
  ): Signal | null {
    const history = this.signalHistory[symbol] || { lastSignal: 0, signalType: null };
    const now = Date.now();

    if (now - history.lastSignal < this.signalCooldown) {
      return null;
    }

    const confidence = this.calculateConfidence(indicators, kline.close);
    
    if (confidence < this.config.minConfidence) {
      return null;
    }

    let signalType: 'long' | 'short' | null = null;
    let reason: string = '';

    if (this.isLongSignal(indicators, kline.close)) {
      signalType = 'long';
      reason = this.buildLongReason(indicators);
    } else if (this.isShortSignal(indicators, kline.close)) {
      signalType = 'short';
      reason = this.buildShortReason(indicators);
    }

    if (!signalType) return null;

    const signal: Signal = {
      id: `${symbol}-${timeframe}-${now}`,
      timestamp: now,
      symbol: symbol.toUpperCase().replace('USDT', '/USDT'),
      type: signalType,
      entryPrice: kline.close,
      stopLoss: signalType === 'long' 
        ? kline.close * (1 - (indicators.atr * this.config.atrMultiplier) / kline.close)
        : kline.close * (1 + (indicators.atr * this.config.atrMultiplier) / kline.close),
      takeProfit: signalType === 'long'
        ? kline.close * (1 + (indicators.atr * this.config.atrMultiplier * 2) / kline.close)
        : kline.close * (1 - (indicators.atr * this.config.atrMultiplier * 2) / kline.close),
      confidence,
      timeframe,
      indicators,
      reason
    };

    this.signalHistory[symbol] = { lastSignal: now, signalType };
    
    return signal;
  }

  private calculateConfidence(indicators: TechnicalIndicators, price: number): number {
    let score = 50;

    if (indicators.rsi < 30) score += 15;
    else if (indicators.rsi > 70) score -= 15;

    if (indicators.macd.histogram > 0.5) score += 15;
    else if (indicators.macd.histogram < -0.5) score -= 15;

    if (indicators.ema_fast > indicators.ema_slow) score += 10;
    else score -= 10;

    if (price < indicators.bollinger.lower) score += 10;
    else if (price > indicators.bollinger.upper) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  private isLongSignal(indicators: TechnicalIndicators, price: number): boolean {
    const rsiOversold = indicators.rsi < this.config.minRSI;
    const macdBullish = indicators.macd.histogram > 0;
    const emaBullish = indicators.ema_fast > indicators.ema_slow;
    const bbOversold = price <= indicators.bollinger.lower;

    return (rsiOversold ? 1 : 0) + (macdBullish ? 1 : 0) + (emaBullish ? 1 : 0) + (bbOversold ? 1 : 0) >= 3;
  }

  private isShortSignal(indicators: TechnicalIndicators, price: number): boolean {
    const rsiOverbought = indicators.rsi > this.config.maxRSI;
    const macdBearish = indicators.macd.histogram < 0;
    const emaBearish = indicators.ema_fast < indicators.ema_slow;
    const bbOverbought = price >= indicators.bollinger.upper;

    return (rsiOverbought ? 1 : 0) + (macdBearish ? 1 : 0) + (emaBearish ? 1 : 0) + (bbOverbought ? 1 : 0) >= 3;
  }

  private buildLongReason(indicators: TechnicalIndicators): string {
    const reasons: string[] = [];
    if (indicators.rsi < 30) reasons.push(`RSI sobrevendido (${indicators.rsi.toFixed(1)})`);
    if (indicators.macd.histogram > 0) reasons.push('MACD bullish crossover');
    if (indicators.ema_fast > indicators.ema_slow) reasons.push('EMA 12 > EMA 26');
    return reasons.join(' | ');
  }

  private buildShortReason(indicators: TechnicalIndicators): string {
    const reasons: string[] = [];
    if (indicators.rsi > 70) reasons.push(`RSI sobrecomprado (${indicators.rsi.toFixed(1)})`);
    if (indicators.macd.histogram < 0) reasons.push('MACD bearish crossover');
    if (indicators.ema_fast < indicators.ema_slow) reasons.push('EMA 12 < EMA 26');
    return reasons.join(' | ');
  }

  getAssets(): Asset[] {
    return Object.entries(this.klines).map(([symbol, timeframes]) => {
      const klines1h = timeframes['1h'] || [];
      const lastKline = klines1h[klines1h.length - 1];
      
      return {
        symbol: symbol.toUpperCase().replace('USDT', '/USDT'),
        name: this.getAssetName(symbol),
        price: lastKline?.close || 0,
        change24h: 0,
        volume24h: lastKline?.volume || 0,
        lastSignal: this.signalHistory[symbol] ? undefined : undefined
      };
    });
  }

  private getAssetName(symbol: string): string {
    const names: { [key: string]: string } = {
      'btcusdt': 'Bitcoin',
      'ethusdt': 'Ethereum',
      'bnbusdt': 'BNB',
      'solusdt': 'Solana',
      'xrpusdt': 'XRP'
    };
    return names[symbol.toLowerCase()] || symbol.toUpperCase();
  }

  stop(): void {
    this.ws.disconnect();
    console.log('[SignalEngine] Stopped');
  }
}