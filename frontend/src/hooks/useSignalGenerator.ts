import { useState, useEffect, useRef, useCallback } from 'react';
import { Kline, getIndicators, evaluateStrategies } from '../services/indicators';
import { fetchAllKlines, subscribeToKlines, disconnect, SYMBOLS } from '../services/klineService';

const API_URL = 'https://crypto-signals-idfn.onrender.com';

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
  strategies: string;
  rsi: number;
  macdValue: number;
  macdSignal: number;
  macdHistogram: number;
  emaFast: number;
  emaSlow: number;
  emaSignal: number;
  bollingerUpper: number;
  bollingerMiddle: number;
  bollingerLower: number;
  atr: number;
  volumeRatio: number;
  trend: string;
  status: 'open' | 'won' | 'lost' | 'cancelled';
  closedAt?: number;
  closedPrice?: number;
  pnlPct1x?: number;
  pnlPct2x?: number;
  pnlPct3x?: number;
  pnlPct5x?: number;
  exitReason?: string;
}

export interface AnalysisState {
  signals: Signal[];
  connected: boolean;
  analyzing: boolean;
  lastUpdate: number;
}

const TRACKED_SYMBOLS_1H = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
const TRACKED_SYMBOLS_4H = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT'];

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function pnlFor(type: 'long' | 'short', entry: number, exit: number, multiplier: number): number {
  const base = type === 'long'
    ? ((exit - entry) / entry) * 100
    : ((entry - exit) / entry) * 100;
  return Math.round(base * multiplier * 100) / 100;
}

export function useSignalGenerator() {
  const [state, setState] = useState<AnalysisState>({
    signals: [],
    connected: false,
    analyzing: false,
    lastUpdate: 0
  });

  const klines1h = useRef<Map<string, Kline[]>>(new Map());
  const klines4h = useRef<Map<string, Kline[]>>(new Map());
  const openSignals = useRef<Map<string, Signal>>(new Map());
  const lastSignalTime = useRef<Map<string, number>>(new Map());
  const cooldownMs = 30 * 60 * 1000;

  const loadSignals = useCallback(async () => {
    try {
      const resp = await fetch(`${API_URL}/api/signals?limit=100`);
      const data: Signal[] = await resp.json();
      openSignals.current.clear();
      for (const s of data) {
        if (s.status === 'open') openSignals.current.set(s.id, s);
      }
      setState(prev => ({ ...prev, signals: data }));
    } catch {}
  }, []);

  const saveSignal = useCallback(async (signal: Signal) => {
    try {
      await fetch(`${API_URL}/api/signals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signal)
      });
      setState(prev => ({
        ...prev,
        signals: [signal, ...prev.signals.filter(s => s.id !== signal.id)]
      }));
    } catch (err) {
      console.error('[Signal] Failed to save:', err);
    }
  }, []);

  const closeSignal = useCallback(async (signal: Signal, status: 'won' | 'lost', exitPrice: number, reason: string) => {
    const updated: Signal = {
      ...signal,
      status,
      closedAt: Date.now(),
      closedPrice: exitPrice,
      pnlPct1x: pnlFor(signal.type, signal.entryPrice, exitPrice, 1),
      pnlPct2x: pnlFor(signal.type, signal.entryPrice, exitPrice, 2),
      pnlPct3x: pnlFor(signal.type, signal.entryPrice, exitPrice, 3),
      pnlPct5x: pnlFor(signal.type, signal.entryPrice, exitPrice, 5),
      exitReason: reason
    };

    openSignals.current.delete(signal.id);
    try {
      await fetch(`${API_URL}/api/signals/${signal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      setState(prev => ({
        ...prev,
        signals: prev.signals.map(s => s.id === signal.id ? updated : s)
      }));
    } catch (err) {
      console.error('[Signal] Failed to close:', err);
    }
  }, []);

  const checkOpenSignals = useCallback((currentPrices: Map<string, number>) => {
    for (const [, signal] of openSignals.current) {
      const price = currentPrices.get(signal.symbol);
      if (price === undefined) continue;

      if (signal.type === 'long') {
        if (price <= signal.stopLoss) {
          closeSignal(signal, 'lost', signal.stopLoss, 'Stop Loss hit');
        } else if (price >= signal.takeProfit) {
          closeSignal(signal, 'won', signal.takeProfit, 'Take Profit hit');
        }
      } else {
        if (price >= signal.stopLoss) {
          closeSignal(signal, 'lost', signal.stopLoss, 'Stop Loss hit');
        } else if (price <= signal.takeProfit) {
          closeSignal(signal, 'won', signal.takeProfit, 'Take Profit hit');
        }
      }
    }
  }, [closeSignal]);

  const generateSignals = useCallback(async () => {
    setState(prev => ({ ...prev, analyzing: true }));

    for (const symbol of TRACKED_SYMBOLS_1H) {
      const lastTime = lastSignalTime.current.get(`${symbol}-1h`) || 0;
      if (Date.now() - lastTime < cooldownMs) continue;

      const klines = klines1h.current.get(symbol);
      if (!klines || klines.length < 200) continue;

      const indicators = getIndicators(klines);
      const strategySignals = evaluateStrategies(klines, indicators);

      if (strategySignals.length > 0) {
        const best = strategySignals.reduce((a, b) => a.confidence > b.confidence ? a : b);
        const signal: Signal = {
          id: generateId(),
          timestamp: Date.now(),
          symbol,
          type: best.type,
          entryPrice: best.price,
          stopLoss: best.sl,
          takeProfit: best.tp,
          slPct: best.slPct,
          tpPct: best.tpPct,
          confidence: Math.round(best.confidence),
          timeframe: '1h',
          reason: best.reason,
          strategies: strategySignals.map(s => s.name).join(','),
          rsi: Math.round(indicators.rsi * 100) / 100,
          macdValue: Math.round(indicators.macd.value * 1000) / 1000,
          macdSignal: Math.round(indicators.macd.signal * 1000) / 1000,
          macdHistogram: Math.round(indicators.macd.histogram * 1000) / 1000,
          emaFast: Math.round(indicators.emaFast * 100) / 100,
          emaSlow: Math.round(indicators.emaSlow * 100) / 100,
          emaSignal: Math.round(indicators.emaSignal * 100) / 100,
          bollingerUpper: Math.round(indicators.bollinger.upper * 100) / 100,
          bollingerMiddle: Math.round(indicators.bollinger.middle * 100) / 100,
          bollingerLower: Math.round(indicators.bollinger.lower * 100) / 100,
          atr: Math.round(indicators.atr * 100) / 100,
          volumeRatio: Math.round(indicators.volumeRatio * 100) / 100,
          trend: indicators.trend,
          status: 'open'
        };

        await saveSignal(signal);
        openSignals.current.set(signal.id, signal);
        lastSignalTime.current.set(`${symbol}-1h`, Date.now());
        console.log(`[Signal] ${signal.type.toUpperCase()} ${symbol} @ ${signal.entryPrice} (${best.name}, conf: ${signal.confidence}%)`);
      }
    }

    for (const symbol of TRACKED_SYMBOLS_4H) {
      const lastTime = lastSignalTime.current.get(`${symbol}-4h`) || 0;
      if (Date.now() - lastTime < cooldownMs * 2) continue;

      const klines = klines4h.current.get(symbol);
      if (!klines || klines.length < 200) continue;

      const indicators = getIndicators(klines);
      const strategySignals = evaluateStrategies(klines, indicators);

      if (strategySignals.length > 0) {
        const best = strategySignals.reduce((a, b) => a.confidence > b.confidence ? a : b);
        const signal: Signal = {
          id: generateId(),
          timestamp: Date.now(),
          symbol,
          type: best.type,
          entryPrice: best.price,
          stopLoss: best.sl,
          takeProfit: best.tp,
          slPct: best.slPct,
          tpPct: best.tpPct,
          confidence: Math.round(best.confidence),
          timeframe: '4h',
          reason: best.reason,
          strategies: strategySignals.map(s => s.name).join(','),
          rsi: Math.round(indicators.rsi * 100) / 100,
          macdValue: Math.round(indicators.macd.value * 1000) / 1000,
          macdSignal: Math.round(indicators.macd.signal * 1000) / 1000,
          macdHistogram: Math.round(indicators.macd.histogram * 1000) / 1000,
          emaFast: Math.round(indicators.emaFast * 100) / 100,
          emaSlow: Math.round(indicators.emaSlow * 100) / 100,
          emaSignal: Math.round(indicators.emaSignal * 100) / 100,
          bollingerUpper: Math.round(indicators.bollinger.upper * 100) / 100,
          bollingerMiddle: Math.round(indicators.bollinger.middle * 100) / 100,
          bollingerLower: Math.round(indicators.bollinger.lower * 100) / 100,
          atr: Math.round(indicators.atr * 100) / 100,
          volumeRatio: Math.round(indicators.volumeRatio * 100) / 100,
          trend: indicators.trend,
          status: 'open'
        };

        await saveSignal(signal);
        openSignals.current.set(signal.id, signal);
        lastSignalTime.current.set(`${symbol}-4h`, Date.now());
        console.log(`[Signal] ${signal.type.toUpperCase()} ${symbol} @ ${signal.entryPrice} (${best.name}, conf: ${signal.confidence}%)`);
      }
    }

    const prices = new Map<string, number>();
    for (const symbol of SYMBOLS) {
      const k = klines1h.current.get(symbol);
      if (k) prices.set(symbol, k[k.length - 1].close);
    }
    checkOpenSignals(prices);

    setState(prev => ({ ...prev, analyzing: false, lastUpdate: Date.now() }));
  }, [saveSignal, checkOpenSignals]);

  useEffect(() => {
    loadSignals();

    const init = async () => {
      const [h1, h4] = await Promise.all([
        fetchAllKlines('1h', 200),
        fetchAllKlines('4h', 200)
      ]);
      h1.forEach((v, k) => klines1h.current.set(k, v));
      h4.forEach((v, k) => klines4h.current.set(k, v));

      subscribeToKlines((symbol, timeframe, kline) => {
        if (timeframe === '1h') {
          const arr = klines1h.current.get(symbol) || [];
          arr.push(kline);
          if (arr.length > 300) arr.shift();
          klines1h.current.set(symbol, arr);
        } else if (timeframe === '4h') {
          const arr = klines4h.current.get(symbol) || [];
          arr.push(kline);
          if (arr.length > 300) arr.shift();
          klines4h.current.set(symbol, arr);
        }
      });

      setState(prev => ({ ...prev, connected: true }));
      generateSignals();
    };

    init();

    const interval = setInterval(generateSignals, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      disconnect();
    };
  }, [loadSignals, generateSignals]);

  return state;
}
