import { useState, useEffect } from 'react';
import type { LeaderboardEntry } from '../types';

const API = 'https://crypto-signals-idfn.onrender.com';

export function Leaderboard({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [community, setCommunity] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/user/leaderboard`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/user/community`).then(r => r.json()).catch(() => null),
    ]).then(([lb, comm]) => {
      setEntries(Array.isArray(lb) ? lb : []);
      setCommunity(comm);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl border border-gray-700/50 w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur flex items-center justify-between p-4 border-b border-gray-800/50">
          <div>
            <h2 className="text-lg font-black tracking-tight">Ranking Global</h2>
            {community && (
              <div className="text-xs text-gray-500 mt-0.5">
                {community.totalTaken} signals &#183; {community.users} usuarios &#183; Equity: {' '}
                <span className={community.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {community.totalPnl >= 0 ? '+' : ''}{community.totalPnl}%
                </span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-full text-lg">&times;</button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-500 text-sm mt-3">Cargando...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <div className="text-4xl mb-3">&#127942;</div>
            <p className="font-semibold">Sin datos todav&#237;a</p>
            <p className="text-xs mt-1">Tom&#225; tu primer signal para aparecer</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-[10px] text-gray-600 uppercase tracking-widest border-b border-gray-800/50">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Usuario</th>
                <th className="px-4 py-2 text-right">Signals</th>
                <th className="px-4 py-2 text-right">W/L</th>
                <th className="px-4 py-2 text-right">Win%</th>
                <th className="px-4 py-2 text-right">P&L 1x</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={i} className="border-b border-gray-800/30 hover:bg-gray-800/20 transition-colors">
                  <td className="px-4 py-2.5 text-gray-600 text-xs">{i + 1}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-300">{e.oderId}</td>
                  <td className="px-4 py-2.5 text-right font-bold">{e.taken}</td>
                  <td className="px-4 py-2.5 text-right text-xs">{e.won}/{e.lost}</td>
                  <td className={`px-4 py-2.5 text-right font-bold ${e.winRate >= 55 ? 'text-emerald-400' : e.winRate > 0 ? 'text-yellow-400' : 'text-gray-600'}`}>
                    {e.winRate > 0 ? `${e.winRate}%` : '—'}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-black text-sm ${e.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
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
