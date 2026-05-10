import { useState, useEffect } from 'react';

const API = 'https://crypto-signals-idfn.onrender.com';

interface HistoryEntry {
  oderId: string;
  action: string;
  pnlPct1x?: number;
  timestamp: number;
}

interface UserHistory {
  total: number;
  taken: number;
  resolved: number;
  won: number;
  lost: number;
  winRate: number;
  totalPnl: number;
  history: HistoryEntry[];
}

export function MySignals({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<UserHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem('cs_user_v2') ? JSON.parse(localStorage.getItem('cs_user_v2')!).id : 'anon';
    fetch(`${API}/api/user/history?userId=${userId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl border border-gray-700/50 w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur flex items-center justify-between p-4 border-b border-gray-800/50">
          <h2 className="text-lg font-black tracking-tight">Mis Signals</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-full text-lg">&times;</button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-500 text-sm mt-3">Cargando...</p>
          </div>
        ) : !data || data.total === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <div className="text-4xl mb-3">&#128679;</div>
            <p className="font-semibold">No ten&#233;s signals todav&#237;a</p>
            <p className="text-xs mt-2 text-gray-600">Tom&#225; tu primer signal para comenzar a trackear tu performance</p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
              <div className="bg-gray-950/50 rounded-xl p-3 text-center">
                <div className="text-2xl font-black text-white">{data.taken}</div>
                <div className="text-[10px] text-gray-500 uppercase">Tomados</div>
              </div>
              <div className="bg-gray-950/50 rounded-xl p-3 text-center">
                <div className={`text-2xl font-black ${data.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>{data.winRate}%</div>
                <div className="text-[10px] text-gray-500 uppercase">Win Rate</div>
              </div>
              <div className="bg-gray-950/50 rounded-xl p-3 text-center">
                <div className="text-2xl font-black text-white">{data.resolved}</div>
                <div className="text-[10px] text-gray-500 uppercase">Resueltos</div>
              </div>
              <div className="bg-gray-950/50 rounded-xl p-3 text-center">
                <div className={`text-2xl font-black ${data.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {data.totalPnl >= 0 ? '+' : ''}{data.totalPnl}%
                </div>
                <div className="text-[10px] text-gray-500 uppercase">P&L 1x</div>
              </div>
            </div>

            <div className="px-4 pb-2 text-xs text-gray-500 flex gap-4">
              <span className="text-emerald-400">{data.won}W</span>
              <span className="text-red-400">{data.lost}L</span>
              <span className="text-gray-600">{data.taken - data.resolved} abiertos</span>
            </div>

            <table className="w-full text-sm">
              <thead className="text-[10px] text-gray-600 uppercase tracking-widest border-t border-gray-800/50">
                <tr>
                  <th className="px-4 py-2 text-left">Fecha</th>
                  <th className="px-4 py-2 text-left">Signal ID</th>
                  <th className="px-4 py-2 text-center">Estado</th>
                  <th className="px-4 py-2 text-right">P&L 1x</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((h, i) => (
                  <tr key={i} className="border-b border-gray-800/30 hover:bg-gray-800/20">
                    <td className="px-4 py-2.5 text-xs text-gray-400">
                      {new Date(h.timestamp).toLocaleString('es', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{h.oderId.slice(0, 14)}</td>
                    <td className="px-4 py-2.5 text-center">
                      {h.action === 'taken' ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-950/50 text-blue-400 border border-blue-500/30">Abierto</span>
                      ) : h.action === 'won' ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950/50 text-emerald-400 border border-emerald-500/30">Won</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-950/50 text-red-400 border border-red-500/30">Lost</span>
                      )}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-black ${h.pnlPct1x !== undefined ? (h.pnlPct1x >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-gray-600'}`}>
                      {h.pnlPct1x !== undefined ? ((h.pnlPct1x >= 0 ? '+' : '') + h.pnlPct1x.toFixed(1) + '%') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
