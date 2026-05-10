import { useState } from 'react';
import { Header } from './components/Header';
import { SignalsFeed } from './components/SignalsFeed';
import { PriceTicker } from './components/PriceTicker';
import { useSignalGenerator } from './hooks/useSignalGenerator';
import { StatsPanel } from './components/StatsPanel';
import { EquityChart } from './components/EquityChart';

function App() {
  const { signals, connected, analyzing, lastUpdate } = useSignalGenerator();
  const [leverage, setLeverage] = useState<1 | 2 | 3 | 5>(1);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header
        connected={connected}
        analyzing={analyzing}
        lastUpdate={lastUpdate}
        onLeverageChange={setLeverage}
        leverage={leverage}
      />

      <main className="p-6 max-w-screen-2xl mx-auto space-y-6">
        <section>
          <h2 className="text-lg font-semibold mb-3 text-gray-300">Precios en Vivo</h2>
          <PriceTicker />
        </section>

        <StatsPanel signals={signals} leverage={leverage} />

        <EquityChart signals={signals} leverage={leverage} />

        <section>
          <h2 className="text-lg font-semibold mb-3 text-gray-300">Señales Recientes</h2>
          <SignalsFeed signals={signals} leverage={leverage} />
        </section>
      </main>
    </div>
  );
}

export default App;
