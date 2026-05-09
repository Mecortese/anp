import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import type { Ticker } from '../types';

interface PriceTickerProps {
  tickers: Map<string, Ticker>;
}

const POPULAR_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT'
];

export const PriceTicker: React.FC<PriceTickerProps> = ({ tickers }) => {
  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${price.toLocaleString('es-ES', { maximumFractionDigits: 2 })}`;
    if (price >= 1) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  const formatVolume = (vol: number) => {
    if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
    if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
    if (vol >= 1e3) return `${(vol / 1e3).toFixed(2)}K`;
    return vol.toFixed(2);
  };

  const sortedTickers = Array.from(tickers.values())
    .filter(t => POPULAR_SYMBOLS.includes(t.symbol))
    .sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));

  if (sortedTickers.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <Activity className="w-8 h-8 mx-auto mb-2 text-gray-600" />
        <p className="text-gray-400 text-sm">Conectando con exchange...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
      {sortedTickers.map((ticker) => (
        <div
          key={ticker.symbol}
          className="bg-gray-800 rounded-lg p-3 hover:bg-gray-750 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm">
              {ticker.symbol.replace('USDT', '')}
            </span>
            {ticker.change24h >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
          </div>
          
          <p className="font-mono text-lg mb-1">
            {formatPrice(ticker.price)}
          </p>
          
          <div className="flex items-center justify-between text-xs">
            <span className={ticker.change24h >= 0 ? 'text-green-400' : 'text-red-400'}>
              {ticker.change24h >= 0 ? '+' : ''}{ticker.change24h.toFixed(2)}%
            </span>
            <span className="text-gray-400 flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              {formatVolume(ticker.volume24h)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};