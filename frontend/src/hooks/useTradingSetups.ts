import { useState, useEffect } from 'react';

const BACKEND = 'https://crypto-signals-idfn.onrender.com';

export interface TradeSetup {
  id: string;
  symbol: string;
  type: 'long' | 'short';
  convictionScore: number;
  leverageRecommendation: 1 | 2 | 3 | 5;
  riskLevel: 'low' | 'medium' | 'high';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  slPct: number;
  tpPct: number;
  edges: string[];
  reason: string;
  timeframe: string;
  fundingRate: number;
  fundingEdge: boolean;
  liquidityEdge: boolean;
  structureEdge: boolean;
  momentumEdge: boolean;
  rsi: number;
  macdHistogram: number;
  volumeRatio: number;
  timestamp: number;
  taken?: boolean;
}

interface Stats {
  total: number;
  won: number;
  lost: number;
  winRate: number;
  totalPnl1x: number;
  totalPnl5x: number;
}

export function useTradingSetups() {
  const [setups, setSetups] = useState<TradeSetup[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, won: 0, lost: 0, winRate: 0, totalPnl1x: 0, totalPnl5x: 0 });
  const [loading, setLoading] = useState(true);

  const loadSetups = async () => {
    try {
      const [setupsResp, statsResp] = await Promise.all([
        fetch(`${BACKEND}/api/setups?symbols=BTCUSDT,ETHUSDT,BNBUSDT,SOLUSDT,XRPUSDT,ADAUSDT,LINKUSDT,DOGEUSDT`),
        fetch(`${BACKEND}/api/signals/stats`)
      ]);

      if (setupsResp.ok) {
        const data = await setupsResp.json();
        const withIds = (data as any[]).map((s, i) => ({ ...s, id: `${s.symbol}-${s.timestamp}-${i}` }));
        setSetups(withIds);
      }

      if (statsResp.ok) {
        const s = await statsResp.json();
        setStats({
          total: s.total || 0,
          won: s.won || 0,
          lost: s.lost || 0,
          winRate: s.winRate || 0,
          totalPnl1x: s.totalPnl1x || 0,
          totalPnl5x: s.totalPnl5x || 0
        });
      }

      setLoading(false);
    } catch (err) {
      console.error('[Setups] Failed:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSetups();
    const interval = setInterval(loadSetups, 60000);
    return () => clearInterval(interval);
  }, []);

  return { setups, stats, loading, refresh: loadSetups };
}