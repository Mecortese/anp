import { TrendingUp, TrendingDown } from 'lucide-react';
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
    if (!price) return '---';
    if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
    if (price >= 1) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  const formatVolume = (vol: number) => {
    if (!vol) return '---';
    if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
    if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
    return vol.toFixed(0);
  };

  const filteredTickers = Array.from(tickers.entries())
    .filter(([symbol]) => POPULAR_SYMBOLS.includes(symbol))
    .sort((a, b) => Math.abs(b[1].change24h || 0) - Math.abs(a[1].change24h || 0));

  if (filteredTickers.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-400">
        Cargando precios...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {filteredTickers.map(([symbol, ticker]) => (
        <div key={symbol} className="bg-gray-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-sm">{symbol.replace('USDT', '')}</span>
            {ticker.change24h >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
          </div>
          <p className="font-mono text-lg">{formatPrice(ticker.price)}</p>
          <p className={`text-xs ${ticker.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {ticker.change24h >= 0 ? '+' : ''}{ticker.change24h?.toFixed(2)}%
          </p>
        </div>
      ))}
    </div>
  );
};