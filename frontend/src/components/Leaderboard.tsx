import { useState, useEffect } from 'react';
import type { LeaderboardEntry } from '../types';

const API = 'https://crypto-signals-idfn.onrender.com';

export function Leaderboard({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/user/leaderboard`)
      .then(r => r.json())
      .then(d => { setEntries(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-bold">Leaderboard</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">&times;</button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-3xl mb-2">🏆</div>
            <p>Sin datos todavia</p>
            <p className="text-xs mt-1">Tomá tu primer signal para aparecer en el ranking</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-gray-500 text-xs uppercase border-b border-gray-800">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-right">Signal</th>
                <th className="px-4 py-2 text-right">W/L</th>
                <th className="px-4 py-2 text-right">Win%</th>
                <th className="px-4 py-2 text-right">P&L 1x</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-300">{e.oderId}</td>
                  <td className="px-4 py-2 text-right font-bold">{e.taken}</td>
                  <td className="px-4 py-2 text-right">{e.won}/{e.lost}</td>
                  <td className={`px-4 py-2 text-right font-bold ${e.winRate >= 55 ? 'text-green-400' : e.winRate > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
                    {e.winRate > 0 ? `${e.winRate}%` : '-'}
                  </td>
                  <td className={`px-4 py-2 text-right font-bold ${e.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {e.pnl >= 0 ? '+' : ''}{e.pnl}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
