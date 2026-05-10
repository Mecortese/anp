import { useState } from 'react';
import { useTradingSetups } from './hooks/useTradingSetups';
import { SetupCard } from './components/SetupCard';
import { StatsPanel } from './components/StatsPanel';
import { Disclaimer } from './components/Disclaimer';

export default function App() {
  const { setups, stats, loading, refresh } = useTradingSetups();
  const [leverage, setLeverage] = useState<1 | 2 | 3 | 5>(1);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center font-bold text-sm">AI</div>
            <div>
              <h1 className="font-bold text-lg">Trading Signals Pro</h1>
              <p className="text-xs text-gray-500">Powered by funding rate + market structure analysis</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Apalancamiento:</span>
              {([1, 2, 3, 5] as const).map(lev => (
                <button key={lev} onClick={() => setLeverage(lev)}
                  className={`px-2 py-1 rounded text-xs font-bold transition-colors ${leverage === lev ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                  {lev}x
                </button>
              ))}
            </div>
            <button onClick={refresh} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs">Refresh</button>
            <button onClick={() => setShowDisclaimer(true)} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs">Disclaimer</button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto p-6 space-y-6">
        <StatsPanel stats={stats} leverage={leverage} />

        {loading && (
          <div className="text-center py-8 text-gray-500">Analizando mercados...</div>
        )}

        {!loading && setups.length === 0 && (
          <div className="bg-gray-900 rounded-lg p-8 text-center border border-gray-800">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-gray-400 font-semibold">Sin setups calificados actualmente</p>
            <p className="text-gray-600 text-sm mt-1">El sistema busca configuraciones con convicción ≥ 45%. Revisá en 5 min.</p>
          </div>
        )}

        <div className="space-y-3">
          {setups.map(setup => (
            <SetupCard key={setup.id} setup={setup} leverage={leverage} />
          ))}
        </div>
      </main>

      {showDisclaimer && <Disclaimer onClose={() => setShowDisclaimer(false)} />}
    </div>
  );
}