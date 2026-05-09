import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SignalsFeed } from './components/SignalsFeed';
import { PriceTicker } from './components/PriceTicker';
import { SignalChart } from './components/SignalChart';
import { Commodities } from './components/Commodities';
import { useWebSocket } from './hooks/useWebSocket';

function App() {
  const { signals, tickers, connected } = useWebSocket();

  useEffect(() => {
    console.log('Tickers received:', tickers.size, 'items');
    console.log('Sample ticker:', Array.from(tickers.values())[0]);
  }, [tickers]);

  const todaySignals = signals.filter(
    s => s.timestamp > Date.now() - 24 * 60 * 60 * 1000
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header 
        connected={connected} 
        signalCount={todaySignals.length} 
      />

      <main className="p-6 max-w-screen-2xl mx-auto">
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-300">
            Precios en Vivo
          </h2>
          <PriceTicker tickers={tickers} />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2">
            <h2 className="text-lg font-semibold mb-3 text-gray-300">
              Señales Recientes
            </h2>
            <SignalsFeed signals={signals} />
          </section>

          <aside className="space-y-6">
            <Commodities />
            <SignalChart signals={signals} />
          </aside>
        </div>
      </main>
    </div>
  );
}

export default App;