import { useState, useEffect, useRef } from 'react';
import { useTradingSetups } from './hooks/useTradingSetups';
import { SetupCard } from './components/SetupCard';
import { StatsPanel } from './components/StatsPanel';
import { Disclaimer } from './components/Disclaimer';
import { Leaderboard } from './components/Leaderboard';
import { UserProvider, useUser } from './context/UserContext';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts';

function HeroBanner({ stats, user }: {
  stats: { totalPnl1x: number; winRate: number; total: number; won: number; lost: number; equityCurve?: any[] };
  user: { totalPnl1x: number; signalsTaken: number; signalsWon: number }
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = Math.abs(stats.totalPnl1x);
    if (target === 0) return;
    const duration = 1500;
    const steps = 60;
    const stepVal = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += stepVal;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else setCount(current);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [stats.totalPnl1x]);

  const pnlColor = stats.totalPnl1x >= 0 ? 'text-emerald-400' : 'text-red-400';
  const userColor = user.totalPnl1x >= 0 ? 'text-emerald-400' : 'text-red-400';
  const wrColor = stats.winRate >= 55 ? 'text-emerald-400' : stats.winRate >= 50 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div ref={ref} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-gray-700/50 p-6 mb-6">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-900/10 via-transparent to-blue-900/10" />
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl" />

      <div className="relative grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="text-center">
          <div className={`text-4xl md:text-5xl font-black ${pnlColor} drop-shadow-lg`}>
            {stats.totalPnl1x >= 0 ? '+' : ''}{count.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Equity 1x</div>
        </div>

        <div className="text-center">
          <div className={`text-4xl md:text-5xl font-black ${wrColor} drop-shadow-lg`}>
            {stats.winRate.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Win Rate</div>
        </div>

        <div className="text-center">
          <div className="text-4xl md:text-5xl font-black text-white drop-shadow-lg">
            {stats.total}
          </div>
          <div className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Total Trades</div>
        </div>

        <div className="text-center">
          <div className={`text-4xl md:text-5xl font-black ${userColor} drop-shadow-lg`}>
            {user.signalsTaken > 0 ? (user.totalPnl1x >= 0 ? '+' : '') + user.totalPnl1x.toFixed(1) + '%' : '—'}
          </div>
          <div className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Mi P&L</div>
        </div>
      </div>

      {stats.equityCurve && stats.equityCurve.length > 1 && (
        <div className="mt-4 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.equityCurve}>
              <defs>
                <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={v => v + '%'} width={45} />
              <Tooltip
                contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#888' }}
                formatter={(v: any) => [v?.toFixed(2) + '%', 'Equity']}
              />
              <Area type="monotone" dataKey="equity1x" stroke="#10b981" fill="url(#eqGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-3 flex items-center justify-center gap-6 text-xs text-gray-500">
        <span>{stats.won}W</span>
        <span className="text-gray-700">|</span>
        <span>{stats.lost}L</span>
        <span className="text-gray-700">|</span>
        <span>{user.signalsTaken} signals tomados</span>
      </div>
    </div>
  );
}

function PulseIndicator({ loading }: { loading: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-400'}`} />
      <span className="text-xs text-gray-500">{loading ? 'Actualizando...' : 'Live'}</span>
    </div>
  );
}

function Dashboard() {
  const [tf, setTf] = useState('1H,4H');
  const { setups, stats, loading, refresh } = useTradingSetups({ intervals: tf });
  const { user } = useUser();
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900/80 backdrop-blur border-b border-gray-800/50 px-6 py-3 sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center font-black text-sm shadow-lg shadow-purple-500/20">AI</div>
            <div>
              <h1 className="font-bold text-sm md:text-base tracking-tight">Trading Signals Pro</h1>
              <PulseIndicator loading={loading} />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500">
              <span className="bg-gray-800 px-2 py-1 rounded font-mono">{user.signalsTaken}</span>
              <span>signals</span>
              <span className={user.totalPnl1x >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {user.signalsTaken > 0 ? ((user.totalPnl1x >= 0 ? '+' : '') + user.totalPnl1x.toFixed(1) + '%') : '—'}
              </span>
            </div>

            <div className="hidden md:flex items-center gap-1.5">
              <span className="text-xs text-gray-500">TF:</span>
              {(['1H,4H', '1H', '4H'] as const).map(t => (
                <button key={t} onClick={() => setTf(t)}
                  className={`px-2 py-1 rounded text-xs font-bold transition-all ${tf === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                  {t}
                </button>
              ))}
            </div>
            <button onClick={() => setShowLeaderboard(true)} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs">Ranking</button>
            <button onClick={refresh} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs">Refresh</button>
            <button onClick={() => setShowDisclaimer(true)} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs">Legal</button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto p-4 md:p-6 space-y-4">
        <HeroBanner stats={stats} user={user} />

        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-500 text-sm">Analizando mercados...</span>
          </div>
        )}

        {!loading && setups.length === 0 && (
          <div className="bg-gray-900/50 rounded-2xl p-12 text-center border border-gray-800/50">
            <div className="text-5xl mb-4">&#128269;</div>
            <p className="text-gray-400 font-semibold text-lg">Sin setups calificados</p>
            <p className="text-gray-600 text-sm mt-2">Convicci&#243;n m&#237;nima 65%. Revis&#225; en 5 min.</p>
          </div>
        )}

        <div className="space-y-3">
          {setups.map(setup => (
            <SetupCard key={`${setup.symbol}-${setup.timeframe}-${setup.timestamp}`} setup={setup} leverage={1} />
          ))}
        </div>

        <div className="text-center text-xs text-gray-700 py-4">
          Datos de OKX &#183; No es consejo financiero &#183; Oper&#225; con responsabilidad
        </div>
      </main>

      {showDisclaimer && <Disclaimer onClose={() => setShowDisclaimer(false)} />}
      {showLeaderboard && <Leaderboard onClose={() => setShowLeaderboard(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <UserProvider>
      <Dashboard />
    </UserProvider>
  );
}
