import React from 'react';
import { TrendingUp, TrendingDown, Clock, Target, Zap, X, Check } from 'lucide-react';
import type { Signal } from '../hooks/useSignalGenerator';

interface SignalsFeedProps {
  signals: Signal[];
  leverage: 1 | 2 | 3 | 5;
}

export const SignalsFeed: React.FC<SignalsFeedProps> = ({ signals, leverage }) => {
  const formatTime = (ts: number) =>
    new Date(ts).toLocaleString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const fmtPrice = (p: number) =>
    p >= 1000 ? `$${p.toLocaleString('es', { maximumFractionDigits: 2 })}`
    : p >= 1 ? `$${p.toFixed(4)}`
    : `$${p.toFixed(6)}`;

  if (signals.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg p-8 text-center border border-gray-800">
        <Zap className="w-12 h-12 mx-auto mb-4 text-gray-700" />
        <p className="text-gray-400">Esperando señales...</p>
        <p className="text-gray-600 text-sm mt-1">El motor analiza 1H y 4H en busca de entradas</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {signals.map((s) => {
        const pnlKey = `pnlPct${leverage}x` as keyof Signal;
        const pnl = s[pnlKey] as number | undefined;
        const isWon = s.status === 'won';
        const isLost = s.status === 'lost';

        return (
          <div
            key={s.id}
            className={`bg-gray-900 rounded-lg p-3 border border-gray-800 ${
              s.type === 'long' ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {s.type === 'long'
                  ? <TrendingUp className="w-4 h-4 text-green-500" />
                  : <TrendingDown className="w-4 h-4 text-red-500" />}
                <span className="font-bold text-sm">{s.type.toUpperCase()}</span>
                <span className="text-gray-400 text-sm font-mono">{s.symbol}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{s.timeframe}</span>
                {s.status === 'open' && <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-900 text-yellow-400">ABIERTA</span>}
                {isWon && <span className="text-xs px-1.5 py-0.5 rounded bg-green-900 text-green-400 flex items-center gap-1"><Check className="w-3 h-3" />TPHIT</span>}
                {isLost && <span className="text-xs px-1.5 py-0.5 rounded bg-red-900 text-red-400 flex items-center gap-1"><X className="w-3 h-3" />SLHIT</span>}
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                {formatTime(s.timestamp)}
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2 mt-2 text-xs">
              <div>
                <span className="text-gray-500">Entry</span>
                <div className="font-mono text-green-400">{fmtPrice(s.entryPrice)}</div>
              </div>
              <div>
                <span className="text-gray-500">SL</span>
                <div className="font-mono text-red-400">{fmtPrice(s.stopLoss)}</div>
              </div>
              <div>
                <span className="text-gray-500">TP</span>
                <div className="font-mono text-blue-400">{fmtPrice(s.takeProfit)}</div>
              </div>
              <div>
                <span className="text-gray-500">RSI</span>
                <div className={`font-mono ${s.rsi > 70 ? 'text-red-400' : s.rsi < 30 ? 'text-green-400' : 'text-white'}`}>
                  {s.rsi?.toFixed(1) || '-'}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Conf</span>
                <div className="flex items-center gap-1">
                  <Target className="w-3 h-3 text-purple-400" />
                  <span className="text-purple-400 font-bold">{s.confidence}%</span>
                </div>
              </div>
            </div>

            {(s.status !== 'open') && pnl !== undefined && pnl !== null && (
              <div className={`mt-2 text-sm font-bold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                P&L {leverage}x: {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
                {s.exitReason && <span className="text-gray-500 font-normal text-xs ml-2">({s.exitReason})</span>}
              </div>
            )}

            <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
              <span>MACD: {s.macdHistogram?.toFixed(4) || '-'}</span>
              <span>BB: {s.bollingerLower?.toFixed(0) || '-'} / {s.bollingerUpper?.toFixed(0) || '-'}</span>
              <span>Vol: {s.volumeRatio?.toFixed(2) || '-'}x</span>
              <span>Trend: {s.trend || '-'}</span>
            </div>

            <div className="text-xs text-gray-500 mt-1">
              {s.strategies?.split(',').map(st => (
                <span key={st} className="inline-block px-1 mr-1 mb-1 bg-gray-800 rounded">{st}</span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
