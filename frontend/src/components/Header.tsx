import React from 'react';
import { Activity, Wifi, WifiOff, Download, Loader2 } from 'lucide-react';

interface HeaderProps {
  connected: boolean;
  analyzing: boolean;
  lastUpdate: number;
  onLeverageChange: (lev: 1 | 2 | 3 | 5) => void;
  leverage: 1 | 2 | 3 | 5;
}

export const Header: React.FC<HeaderProps> = ({ connected, analyzing, lastUpdate, onLeverageChange, leverage }) => {
  const lastStr = lastUpdate
    ? `Hace ${Math.round((Date.now() - lastUpdate) / 60000)}m`
    : 'Nunca';

  return (
    <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-purple-500" />
          <h1 className="text-xl font-bold">Crypto Signals Pro</h1>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Apalancamiento:</span>
            {([1, 2, 3, 5] as const).map(lev => (
              <button
                key={lev}
                onClick={() => onLeverageChange(lev)}
                className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                  leverage === lev
                    ? lev === 1 ? 'bg-gray-700 text-white' : 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {lev}x
              </button>
            ))}
          </div>

          {analyzing && (
            <div className="flex items-center gap-2 text-yellow-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">Analizando...</span>
            </div>
          )}

          <span className="text-xs text-gray-500">Último análisis: {lastStr}</span>

          <button
            onClick={() => window.open('/api/signals/export/csv', '_blank')}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs transition-colors"
          >
            <Download className="w-3 h-3" />
            Exportar CSV
          </button>

          <div className="flex items-center gap-2">
            {connected ? (
              <>
                <Wifi className="w-5 h-5 text-green-500" />
                <span className="text-green-500 text-sm">Binance OK</span>
              </>
            ) : (
              <>
                <WifiOff className="w-5 h-5 text-red-500" />
                <span className="text-red-500 text-sm">Reconectando...</span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
