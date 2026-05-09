import { useState, useEffect } from 'react';
import type { Signal, Ticker } from '../types';

const API_URL = '';

export function useWebSocket() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [tickers, setTickers] = useState<Map<string, Ticker>>(new Map());
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/signals?limit=50`)
      .then(res => res.json())
      .then(data => setSignals(Array.isArray(data) ? data : []))
      .catch(() => setConnected(false));

    fetch(`${API_URL}/api/tickers`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const map = new Map<string, Ticker>();
          data.forEach((t: any) => {
            map.set(t.symbol, t);
          });
          setTickers(map);
          setConnected(true);
        }
      })
      .catch(() => setConnected(false));

    const interval = setInterval(() => {
      fetch(`${API_URL}/api/tickers`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const map = new Map<string, Ticker>();
            data.forEach((t: any) => {
              map.set(t.symbol, t);
            });
            setTickers(map);
          }
        })
        .catch(console.error);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return { signals, tickers, connected };
}