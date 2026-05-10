import { useEffect, useState } from 'react';

const OKX_TICKER = 'https://www.okx.com/api/v5/market/ticker';

const SYMBOLS = [
  { okx: 'BTC-USDT', bin: 'BTCUSDT', name: 'BTC' },
  { okx: 'ETH-USDT', bin: 'ETHUSDT', name: 'ETH' },
  { okx: 'BNB-USDT', bin: 'BNBUSDT', name: 'BNB' },
  { okx: 'SOL-USDT', bin: 'SOLUSDT', name: 'SOL' },
  { okx: 'XRP-USDT', bin: 'XRPUSDT', name: 'XRP' },
  { okx: 'ADA-USDT', bin: 'ADAUSDT', name: 'ADA' },
  { okx: 'DOGE-USDT', bin: 'DOGEUSDT', name: 'DOGE' },
  { okx: 'AVAX-USDT', bin: 'AVAXUSDT', name: 'AVAX' },
  { okx: 'DOT-USDT', bin: 'DOTUSDT', name: 'DOT' },
  { okx: 'LINK-USDT', bin: 'LINKUSDT', name: 'LINK' },
];

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
        const results: PriceData[] = [];
        for (const s of SYMBOLS) {
          const resp = await fetch(`${OKX_TICKER}?instId=${s.okx}`);
          if (!resp.ok) continue;
          const json = await resp.json();
          if (json.code !== '0' || !json.data?.[0]) continue;
          const d = json.data[0];
          const last = parseFloat(d.last);
          const open24h = parseFloat(d.open24h);
          const change = open24h > 0 ? ((last - open24h) / open24h) * 100 : 0;
          results.push({ symbol: s.bin, name: s.name, price: last, change24h: Math.round(change * 100) / 100 });
        }
        if (results.length > 0) setPrices(results);
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
