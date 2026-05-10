import { EventEmitter } from 'events';
import { TechnicalAnalyzer } from './indicators.js';
import { BinanceWebSocket, SYMBOLS } from './binance.js';
const DEFAULT_CONFIG = {
    minRSI: 25,
    maxRSI: 75,
    minConfidence: 65,
    atrMultiplier: 1.5,
    signalCooldown: 30 * 60 * 1000
};
export class SignalEngine extends EventEmitter {
    ws;
    klines = {};
    signalHistory = {};
    config;
    constructor(config = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.ws = new BinanceWebSocket([...SYMBOLS.CRYPTO]);
    }
    start() {
        console.log('[SignalEngine] Starting...');
        this.ws.on('kline', (symbol, timeframe, kline) => {
            this.handleKline(symbol, timeframe, kline);
        });
        this.ws.on('ticker', (ticker) => {
            this.emit('ticker', ticker);
        });
        this.ws.connect();
        console.log('[SignalEngine] Connected to Binance WebSocket');
    }
    handleKline(symbol, timeframe, kline) {
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
        }
        else {
            klines.push(kline);
            if (klines.length > 200) {
                klines.shift();
            }
            if (kline.isClosed && this.shouldAnalyze(timeframe)) {
                this.analyzeAndEmit(symbol, timeframe, kline);
            }
        }
    }
    shouldAnalyze(timeframe) {
        return ['1m', '5m', '15m', '1h', '4h', '1d'].includes(timeframe);
    }
    analyzeAndEmit(symbol, timeframe, kline) {
        const klines = this.klines[symbol][timeframe];
        const indicators = TechnicalAnalyzer.calculateAll(klines);
        if (!indicators)
            return;
        const signal = this.detectSignal(symbol, timeframe, kline, indicators);
        if (signal) {
            this.emit('signal', signal);
        }
    }
    detectSignal(symbol, timeframe, kline, indicators) {
        const history = this.signalHistory[symbol] || { lastSignal: 0, signalType: null };
        const now = Date.now();
        if (now - history.lastSignal < this.config.signalCooldown) {
            return null;
        }
        const confidence = this.calculateConfidence(indicators, kline.close);
        if (confidence < this.config.minConfidence) {
            return null;
        }
        let signalType = null;
        let reason = '';
        if (this.isLongSignal(indicators, kline.close)) {
            signalType = 'long';
            reason = this.buildLongReason(indicators);
        }
        else if (this.isShortSignal(indicators, kline.close)) {
            signalType = 'short';
            reason = this.buildShortReason(indicators);
        }
        if (!signalType)
            return null;
        const signal = {
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
    calculateConfidence(indicators, price) {
        let score = 50;
        if (indicators.rsi < 30)
            score += 15;
        else if (indicators.rsi > 70)
            score -= 15;
        if (indicators.macd.histogram > 0.5)
            score += 15;
        else if (indicators.macd.histogram < -0.5)
            score -= 15;
        if (indicators.ema_fast > indicators.ema_slow)
            score += 10;
        else
            score -= 10;
        if (price < indicators.bollinger.lower)
            score += 10;
        else if (price > indicators.bollinger.upper)
            score -= 10;
        return Math.max(0, Math.min(100, score));
    }
    isLongSignal(indicators, price) {
        const rsiOversold = indicators.rsi < this.config.minRSI;
        const macdBullish = indicators.macd.histogram > 0;
        const emaBullish = indicators.ema_fast > indicators.ema_slow;
        const bbOversold = price <= indicators.bollinger.lower;
        return (rsiOversold ? 1 : 0) + (macdBullish ? 1 : 0) + (emaBullish ? 1 : 0) + (bbOversold ? 1 : 0) >= 3;
    }
    isShortSignal(indicators, price) {
        const rsiOverbought = indicators.rsi > this.config.maxRSI;
        const macdBearish = indicators.macd.histogram < 0;
        const emaBearish = indicators.ema_fast < indicators.ema_slow;
        const bbOverbought = price >= indicators.bollinger.upper;
        return (rsiOverbought ? 1 : 0) + (macdBearish ? 1 : 0) + (emaBearish ? 1 : 0) + (bbOverbought ? 1 : 0) >= 3;
    }
    buildLongReason(indicators) {
        const reasons = [];
        if (indicators.rsi < 30)
            reasons.push(`RSI sobrevendido (${indicators.rsi.toFixed(1)})`);
        if (indicators.macd.histogram > 0)
            reasons.push('MACD bullish crossover');
        if (indicators.ema_fast > indicators.ema_slow)
            reasons.push('EMA 12 > EMA 26');
        return reasons.join(' | ');
    }
    buildShortReason(indicators) {
        const reasons = [];
        if (indicators.rsi > 70)
            reasons.push(`RSI sobrecomprado (${indicators.rsi.toFixed(1)})`);
        if (indicators.macd.histogram < 0)
            reasons.push('MACD bearish crossover');
        if (indicators.ema_fast < indicators.ema_slow)
            reasons.push('EMA 12 < EMA 26');
        return reasons.join(' | ');
    }
    getAssets() {
        return Object.entries(this.klines).map(([symbol, timeframes]) => {
            const klines1h = timeframes['1h'] || [];
            const lastKline = klines1h[klines1h.length - 1];
            return {
                symbol: symbol.toUpperCase().replace('USDT', '/USDT'),
                name: this.getAssetName(symbol),
                price: lastKline?.close || 0,
                change24h: 0,
                volume24h: lastKline?.volume || 0
            };
        });
    }
    getAssetName(symbol) {
        const names = {
            'btcusdt': 'Bitcoin',
            'ethusdt': 'Ethereum',
            'bnbusdt': 'BNB',
            'solusdt': 'Solana',
            'xrpusdt': 'XRP'
        };
        return names[symbol.toLowerCase()] || symbol.toUpperCase();
    }
    stop() {
        this.ws.disconnect();
        console.log('[SignalEngine] Stopped');
    }
}
