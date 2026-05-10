import { useState, useEffect, useCallback } from 'react';

const BACKEND = 'https://crypto-signals-idfn.onrender.com';
const OKX_CORS = BACKEND + '/api';

interface ClosedSignal {
  id: string;
  timestamp: number;
  closedAt: number;
  symbol: string;
  type: 'long' | 'short';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  slPct: number;
  tpPct: number;
  closedPrice: number;
  status: 'won' | 'lost';
  pnlPct1x: number;
  exitReason: string;
  timeframe: string;
  reason: string;
  strategies: string;
  rsi: number;
  macdHistogram: number;
  confidence: number;
  ageHours: number;
}

interface SignalStats {
  total: number;
  won: number;
  lost: number;
  winRate: number;
  totalPnl1x: number;
  totalPnl5x: number;
  byTimeframe: any[];
  bySymbol: any[];
  equityCurve: any[];
}

export function useSignalsFeed() {
  const [signals, setSignals] = useState<ClosedSignal[]>([]);
  const [stats, setStats] = useState<SignalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ symbol: '', status: '', timeframe: '' });

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter.symbol) params.set('symbol', filter.symbol);
      if (filter.status) params.set('status', filter.status);
      if (filter.timeframe) params.set('timeframe', filter.timeframe);

      const [sigResp, statResp] = await Promise.all([
        fetch(`${BACKEND}/api/signals/closed?limit=50&${params}`),
        fetch(`${BACKEND}/api/signals/stats`)
      ]);

      if (sigResp.ok) {
        const data = await sigResp.json();
        setSignals(Array.isArray(data) ? data : []);
      }
      if (statResp.ok) {
        const s = await statResp.json();
        setStats(s);
      }
    } catch (err) {
      console.error('[SignalsFeed] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  return { signals, stats, loading, filter, setFilter, refresh: load };
}

function fmtPrice(p: number) {
  return p >= 1000 ? `$${p.toLocaleString('es', { maximumFractionDigits: 2 })}` : p >= 1 ? `$${p.toFixed(4)}` : `$${p.toFixed(6)}`;
}

function SignalCard({ s }: { s: ClosedSignal }) {
  const isWon = s.status === 'won';
  const hoursAgo = Math.round((Date.now() - s.timestamp) / 3600000);
  const timeStr = hoursAgo < 24
    ? `hace ${hoursAgo}h`
    : new Date(s.timestamp).toLocaleDateString('es', { day: '2-digit', month: '2-digit' });

  return (
    <div className={`bg-gray-900/60 rounded-xl p-4 border border-gray-800/40 border-l-4 ${isWon ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className={`text-sm font-black px-2 py-1 rounded ${s.type === 'long' ? 'bg-emerald-950/50 text-emerald-400' : 'bg-red-950/50 text-red-400'}`}>
            {s.type === 'long' ? 'LONG' : 'SHORT'}
          </span>
          <div>
            <div className="font-bold text-sm">{s.symbol}</div>
            <div className="text-[10px] text-gray-600">{s.timeframe} &#183; {timeStr}</div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-xl font-black ${isWon ? 'text-emerald-400' : 'text-red-400'}`}>
            {isWon ? '+' : ''}{s.pnlPct1x?.toFixed(1)}%
          </div>
          <div className={`text-[10px] font-bold ${isWon ? 'text-emerald-400' : 'text-red-400'}`}>
            {isWon ? 'TP HIT' : 'SL HIT'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-2 text-center">
        <div className="bg-gray-950/50 rounded-lg p-2">
          <div className="text-[10px] text-gray-600 uppercase">Entry</div>
          <div className="font-mono text-emerald-400 text-xs font-bold">{fmtPrice(s.entryPrice)}</div>
        </div>
        <div className="bg-gray-950/50 rounded-lg p-2">
          <div className="text-[10px] text-gray-600 uppercase">SL</div>
          <div className="font-mono text-red-400 text-xs font-bold">{fmtPrice(s.stopLoss)}</div>
          <div className="text-[10px] text-red-400">-{s.slPct}%</div>
        </div>
        <div className="bg-gray-950/50 rounded-lg p-2">
          <div className="text-[10px] text-gray-600 uppercase">TP</div>
          <div className="font-mono text-blue-400 text-xs font-bold">{fmtPrice(s.takeProfit)}</div>
          <div className="text-[10px] text-blue-400">+{s.tpPct}%</div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-gray-700">
        <span>RSI: {s.rsi?.toFixed(1)}</span>
        <span className="text-gray-800">|</span>
        <span>Conf: {s.confidence}</span>
        <span className="text-gray-800">|</span>
        <span className="truncate flex-1 pl-1">{s.reason || s.strategies || '—'}</span>
      </div>

      {s.exitReason && (
        <div className="mt-2 text-[10px] text-gray-600 bg-gray-950/30 rounded px-2 py-1">
          {s.exitReason}
        </div>
      )}
    </div>
  );
}

export function SignalsFeed() {
  const { signals, stats, loading, filter, setFilter, refresh } = useSignalsFeed();
  const [tab, setTab] = useState<'feed' | 'stats'>('feed');

  const wrColor = (stats?.winRate || 0) >= 55 ? 'text-emerald-400' : (stats?.winRate || 0) >= 50 ? 'text-yellow-400' : 'text-red-400';
  const pnlColor = (stats?.totalPnl1x || 0) >= 0 ? 'text-emerald-400' : 'text-red-400';

  const symbols = [...new Set(signals.map(s => s.symbol))];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-black tracking-tight">Historial de Signals</h2>
          <p className="text-xs text-gray-500">Resultados reales de se&#241;ales pasadas</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refresh} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs">Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-gray-900/60 rounded-xl p-3 text-center">
          <div className={`text-2xl font-black ${wrColor}`}>{stats?.winRate?.toFixed(1) || '—'}%</div>
          <div className="text-[10px] text-gray-500 uppercase">Win Rate</div>
        </div>
        <div className="bg-gray-900/60 rounded-xl p-3 text-center">
          <div className={`text-2xl font-black ${pnlColor}`}>
            {(stats?.totalPnl1x || 0) >= 0 ? '+' : ''}{stats?.totalPnl1x?.toFixed(1) || 0}%
          </div>
          <div className="text-[10px] text-gray-500 uppercase">Equity 1x</div>
        </div>
        <div className="bg-gray-900/60 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-white">{stats?.won || 0}<span className="text-emerald-400">W</span> / <span className="text-red-400">{stats?.lost || 0}</span><span className="text-red-400">L</span></div>
          <div className="text-[10px] text-gray-500 uppercase">W / L</div>
        </div>
        <div className="bg-gray-900/60 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-white">{stats?.total || 0}</div>
          <div className="text-[10px] text-gray-500 uppercase">Totales</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select value={filter.symbol} onChange={e => setFilter(f => ({ ...f, symbol: e.target.value }))} className="bg-gray-800 text-xs rounded px-2 py-1.5 border border-gray-700 text-white">
          <option value="">Todos los s&#237;mbolos</option>
          {symbols.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))} className="bg-gray-800 text-xs rounded px-2 py-1.5 border border-gray-700 text-white">
          <option value="">Todos</option>
          <option value="won">Solo Wins</option>
          <option value="lost">Solo Losses</option>
        </select>
        <select value={filter.timeframe} onChange={e => setFilter(f => ({ ...f, timeframe: e.target.value }))} className="bg-gray-800 text-xs rounded px-2 py-1.5 border border-gray-700 text-white">
          <option value="">Todos los TF</option>
          <option value="1H">1H</option>
          <option value="4H">4H</option>
        </select>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 text-sm">Cargando historial...</span>
        </div>
      ) : signals.length === 0 ? (
        <div className="bg-gray-900/50 rounded-2xl p-12 text-center border border-gray-800/40">
          <div className="text-4xl mb-3">&#128679;</div>
          <p className="text-gray-400 font-semibold">Sin se&#241;ales todav&#237;a</p>
          <p className="text-gray-600 text-xs mt-2">Las se&#241;ales aparecer&#225;n cuando se resuelvan contra SL o TP</p>
        </div>
      ) : (
        <div className="space-y-3">
          {signals.map(s => <SignalCard key={s.id} s={s} />)}
        </div>
      )}

      {stats?.equityCurve && stats.equityCurve.length > 2 && (
        <div className="mt-4 bg-gray-900/60 rounded-xl p-4 border border-gray-800/40">
          <div className="text-xs text-gray-500 uppercase mb-3">Equity Curve (1x)</div>
        </div>
      )}
    </div>
  );
}
