import { useEffect, useState } from 'react';

const COINGECKO_IDS: Record<string, string> = {
  'BTCUSDT': 'bitcoin',
  'ETHUSDT': 'ethereum',
  'BNBUSDT': 'binancecoin',
  'SOLUSDT': 'solana',
  'XRPUSDT': 'ripple',
  'ADAUSDT': 'cardano',
  'DOGEUSDT': 'dogecoin',
  'AVAXUSDT': 'avalanche-2',
  'DOTUSDT': 'polkadot',
  'LINKUSDT': 'chainlink',
};

const SYMBOLS = Object.keys(COINGECKO_IDS);

interface PriceData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
}

export function PriceTicker() {
  const [prices, setPrices] = useState<PriceData[]>([]);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const ids = Object.values(COINGECKO_IDS).join(',');
        const resp = await fetch(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=volume_desc&sparkline=false`
        );
        const data = await resp.json();

        const priceMap = new Map<string, PriceData>();
        for (const coin of data) {
          const entry = Object.entries(COINGECKO_IDS).find(([, id]) => id === coin.id);
          if (entry) {
            const [symbol] = entry;
            priceMap.set(symbol, {
              symbol,
              name: coin.symbol.toUpperCase(),
              price: coin.current_price,
              change24h: coin.price_change_percentage_24h
            });
          }
        }

        setPrices(SYMBOLS.map(s => priceMap.get(s)!).filter(Boolean));
      } catch (err) {
        console.error('[Prices] Failed:', err);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 15000);
    return () => clearInterval(interval);
  }, []);

  const fmtPrice = (p: number) =>
    p >= 1000 ? `$${p.toLocaleString('es', { maximumFractionDigits: 2 })}`
    : p >= 1 ? `$${p.toFixed(4)}`
    : `$${p.toFixed(6)}`;

  if (prices.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
      {prices.map(p => (
        <div key={p.symbol} className="bg-gray-900 rounded-lg p-3 border border-gray-800">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-sm">{p.name}</span>
            <span className={`text-xs font-bold ${p.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {p.change24h >= 0 ? '+' : ''}{p.change24h.toFixed(2)}%
            </span>
          </div>
          <div className="font-mono text-white font-semibold">
            {fmtPrice(p.price)}
          </div>
        </div>
      ))}
    </div>
  );
}
