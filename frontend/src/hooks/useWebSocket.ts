import { useState, useEffect } from 'react';
import type { Signal, Ticker } from '../types';

const API_URL = '';

interface CoinGeckoTicker {
  id: string;
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number;
}

const SYMBOL_MAP: { [key: string]: string } = {
  'bitcoin': 'BTCUSDT',
  'ethereum': 'ETHUSDT',
  'binancecoin': 'BNBUSDT',
  'solana': 'SOLUSDT',
  'ripple': 'XRPUSDT',
  'cardano': 'ADAUSDT',
  'dogecoin': 'DOGEUSDT',
  'avalanche-2': 'AVAXUSDT',
  'polkadot': 'DOTUSDT',
  'matic-network': 'MATICUSDT',
  'chainlink': 'LINKUSDT',
  'litecoin': 'LTCUSDT',
  'uniswap': 'UNIUSDT',
  'cosmos': 'ATOMUSDT',
  'ethereum-classic': 'ETCUSDT'
};

const COINGECKO_IDS = Object.keys(SYMBOL_MAP).join(',');

export function useWebSocket() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [tickers, setTickers] = useState<Map<string, Ticker>>(new Map());
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/signals?limit=50`)
      .then(res => res.json())
      .then(data => setSignals(Array.isArray(data) ? data : []))
      .catch(() => setConnected(false));

    const fetchTickersDirect = async () => {
      try {
        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${COINGECKO_IDS}&order=volume_desc&sparkline=false`
        );
        const data: CoinGeckoTicker[] = await response.json();
        
        const map = new Map<string, Ticker>();
        data.forEach((coin) => {
          const symbol = SYMBOL_MAP[coin.id];
          if (symbol) {
            map.set(symbol, {
              symbol,
              price: coin.current_price,
              change24h: coin.price_change_percentage_24h,
              volume24h: 0
            });
          }
        });
        setTickers(map);
        setConnected(true);
      } catch (error) {
        console.error('[CoinGecko] Error:', error);
      }
    };

    fetchTickersDirect();
    const interval = setInterval(fetchTickersDirect, 15000);
    return () => clearInterval(interval);
  }, []);

  return { signals, tickers, connected };
}