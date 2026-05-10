import { useState } from 'react';
import { SetupCard } from './components/SetupCard';
import { SignalsFeed } from './components/SignalsFeed';
import { Disclaimer } from './components/Disclaimer';
import { Leaderboard } from './components/Leaderboard';
import { MySignals } from './components/MySignals';
import { useTradingSetups } from './hooks/useTradingSetups';
import { useUser } from './context/UserContext';

const API = 'https://crypto-signals-idfn.onrender.com';

function PulseIndicator({ loading }: { loading: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-400'}`} />
      <span className="text-[10px] text-gray-500">{loading ? 'Analizando...' : 'Live'}</span>
    </div>
  );
}

export default function App() {
  const { setups, loading, refresh } = useTradingSetups({ intervals: '1H,4H' });
  const { user } = useUser();
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showMySignals, setShowMySignals] = useState(false);
  const [showFeed, setShowFeed] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900/80 backdrop-blur border-b border-gray-800/50 px-4 py-2.5 sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center font-black text-sm shadow-lg shadow-purple-500/20">AI</div>
            <div>
              <h1 className="font-bold text-sm tracking-tight">Trading Signals Pro</h1>
              <PulseIndicator loading={loading} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500">
              <span className="bg-gray-800 px-2 py-1 rounded font-mono text-[10px]">{user.signalsTaken}</span>
              <span>signals</span>
            </div>
            <button onClick={() => setShowFeed(true)} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs">Historial</button>
            <button onClick={() => setShowMySignals(true)} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs">Mis Signals</button>
            <button onClick={() => setShowLeaderboard(true)} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs hidden md:block">Ranking</button>
            <button onClick={refresh} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs">Refresh</button>
            <button onClick={() => setShowDisclaimer(true)} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs">Legal</button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto p-4 md:p-5 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-black tracking-tight">Setups Activos Ahora</h2>
              <p className="text-xs text-gray-500">
                {loading ? 'Analizando...' : `${setups.length} setups calificados`}
                {' '}
                <span className="text-emerald-400">{setups.filter(s => s.type === 'long').length} LONG</span>
                {' '}
                <span className="text-red-400">{setups.filter(s => s.type === 'short').length} SHORT</span>
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-500 text-sm">Analizando mercados...</span>
            </div>
          ) : setups.length === 0 ? (
            <div className="bg-gray-900/50 rounded-2xl p-12 text-center border border-gray-800/40">
              <div className="text-4xl mb-3">&#128269;</div>
              <p className="text-gray-400 font-semibold">Sin setups calificados ahora</p>
              <p className="text-gray-600 text-xs mt-2">Convicci&#243;n m&#237;nima 65%. Revis&#225; en 5 min.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {setups.map(setup => (
                <SetupCard key={`${setup.symbol}-${setup.timeframe}-${setup.timestamp}`} setup={setup} />
              ))}
            </div>
          )}
        </div>

        <div className="text-center text-[10px] text-gray-700 py-2">
          Datos de OKX &#183; No es consejo financiero &#183; Oper&#225; con responsabilidad
        </div>
      </main>

      {showDisclaimer && <Disclaimer onClose={() => setShowDisclaimer(false)} />}
      {showLeaderboard && <Leaderboard onClose={() => setShowLeaderboard(false)} />}
      {showMySignals && <MySignals onClose={() => setShowMySignals(false)} />}
      {showFeed && (
        <div className="fixed inset-0 z-50 bg-black/90 overflow-y-auto">
          <div className="max-w-screen-xl mx-auto p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setShowFeed(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm">&#8592; Volver</button>
            </div>
            <SignalsFeed />
          </div>
        </div>
      )}
    </div>
  );
}
