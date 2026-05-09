import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Commodity {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
}

const API_URL = '';

export const Commodities: React.FC = () => {
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCommodities = async () => {
      try {
        const res = await fetch(`${API_URL}/api/commodities`);
        const data = await res.json();
        setCommodities(data);
      } catch (error) {
        console.error('Error fetching commodities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCommodities();
    const interval = setInterval(fetchCommodities, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number, symbol: string) => {
    if (symbol === 'XAUUSD') {
      return `$${price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${price.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <p className="text-gray-400">Cargando commodities...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {commodities.map((commodity) => (
        <div
          key={commodity.symbol}
          className="bg-gray-800 rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">
                {commodity.symbol === 'XAUUSD' ? '🪙' : '🛢️'}
              </span>
              <div>
                <p className="font-bold">{commodity.name}</p>
                <p className="text-xs text-gray-400">{commodity.symbol}</p>
              </div>
            </div>
            {commodity.change24h >= 0 ? (
              <TrendingUp className="w-5 h-5 text-green-500" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-500" />
            )}
          </div>
          
          <p className="text-2xl font-mono mb-1">
            {formatPrice(commodity.price, commodity.symbol)}
          </p>
          
          <p className={`text-sm ${commodity.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {commodity.change24h >= 0 ? '+' : ''}{commodity.change24h.toFixed(2)}%
          </p>
        </div>
      ))}
    </div>
  );
};