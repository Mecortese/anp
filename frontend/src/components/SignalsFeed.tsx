import React from 'react';
import { TrendingUp, TrendingDown, Clock, Target, Zap } from 'lucide-react';
import type { Signal } from '../types';

interface SignalsFeedProps {
  signals: Signal[];
}

export const SignalsFeed: React.FC<SignalsFeedProps> = ({ signals }) => {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${price.toLocaleString('es-ES', { maximumFractionDigits: 2 })}`;
    if (price >= 1) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  if (signals.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-8 text-center">
        <Zap className="w-12 h-12 mx-auto mb-4 text-gray-600" />
        <p className="text-gray-400">Esperando señales...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {signals.map((signal) => (
        <div
          key={signal.id}
          className={`bg-gray-800 rounded-lg p-4 border-l-4 ${
            signal.type === 'long' ? 'border-green-500' : 'border-red-500'
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {signal.type === 'long' ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )}
              <span className="font-bold text-lg">
                {signal.type.toUpperCase()}
              </span>
              <span className="text-gray-400 text-lg">{signal.symbol}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Clock className="w-4 h-4" />
              {formatTime(signal.timestamp)}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-3">
            <div>
              <p className="text-gray-400 text-xs">Entrada</p>
              <p className="font-mono text-green-400">{formatPrice(signal.entryPrice)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Stop Loss</p>
              <p className="font-mono text-red-400">{formatPrice(signal.stopLoss)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Take Profit</p>
              <p className="font-mono text-blue-400">{formatPrice(signal.takeProfit)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-400">
                TF: <span className="text-white">{signal.timeframe}</span>
              </span>
              <span className="text-gray-400">
                RSI: <span className="text-white">{signal.indicators?.rsi?.toFixed(1) || 'N/A'}</span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Target className="w-4 h-4 text-purple-400" />
              <span className="text-purple-400 font-bold">{signal.confidence}%</span>
            </div>
          </div>

          <p className="text-gray-400 text-xs mt-2">{signal.reason}</p>
        </div>
      ))}
    </div>
  );
};