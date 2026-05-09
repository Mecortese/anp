import { useState, useEffect, useRef, useCallback } from 'react';
import type { Signal, Ticker, WSMessage } from '../types';

const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
const API_URL = '';

export function useWebSocket() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [tickers, setTickers] = useState<Map<string, Ticker>>(new Map());
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: 'subscribe', channels: ['signals', 'tickers'] }));
    };

    ws.onmessage = (event) => {
      try {
        const data: WSMessage = JSON.parse(event.data);
        
        switch (data.type) {
          case 'signal':
            if (data.payload && 'symbol' in data.payload) {
              setSignals(prev => [data.payload as Signal, ...prev].slice(0, 100));
            }
            break;
          case 'ticker':
            if (data.payload && 'symbol' in data.payload) {
              const ticker = data.payload as Ticker;
              setTickers(prev => new Map(prev).set(ticker.symbol, ticker));
            }
            break;
        }
      } catch (e) {
        console.error('WS parse error:', e);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setTimeout(connect, 3000);
    };

    ws.onerror = (error) => {
      console.error('WS error:', error);
    };
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/signals?limit=50`)
      .then(res => res.json())
      .then(data => setSignals(data))
      .catch(console.error);

    fetch(`${API_URL}/api/assets`)
      .then(res => res.json())
      .then(data => {
        const map = new Map<string, Ticker>();
        data.forEach((asset: any) => {
          map.set(asset.symbol, {
            symbol: asset.symbol,
            price: asset.price,
            change24h: asset.change24h,
            volume24h: asset.volume24h
          });
        });
        setTickers(map);
      })
      .catch(console.error);

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  return { signals, tickers, connected };
}