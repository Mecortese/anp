import { useState } from 'react';
import type { TradeSetup } from '../hooks/useTradingSetups';

const API = 'https://crypto-signals-idfn.onrender.com';

const fmtPrice = (p: number) =>
  p >= 1000 ? `$${p.toLocaleString('es', { maximumFractionDigits: 2 })}`
  : p >= 1 ? `$${p.toFixed(4)}` : `$${p.toFixed(6)}`;

function formatAge(ts: number) {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.round(mins / 60);
  return `hace ${hrs}h`;
}

export function SetupCard({ setup }: { setup: TradeSetup }) {
  const [taken, setTaken] = useState(false);
  const [loading, setLoading] = useState(false);

  const riskColor = setup.riskLevel === 'high'
    ? 'border-l-emerald-500'
    : setup.riskLevel === 'medium'
    ? 'border-l-yellow-500'
    : 'border-l-blue-500';

  const scoreColor = setup.convictionScore >= 80 ? 'text-emerald-400' : setup.convictionScore >= 65 ? 'text-yellow-400' : 'text-gray-400';
  const levColor = setup.leverageRecommendation >= 5 ? 'text-emerald-400' : setup.leverageRecommendation >= 3 ? 'text-yellow-400' : 'text-gray-400';

  function takeSignal() {
    if (taken || loading) return;
    setLoading(true);
    const id = `setup-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const record = {
      id, timestamp: Date.now(), symbol: setup.symbol, type: setup.type,
      entryPrice: setup.entryPrice, stopLoss: setup.stopLoss, takeProfit: setup.takeProfit,
      slPct: setup.slPct, tpPct: setup.tpPct, confidence: setup.convictionScore,
      timeframe: setup.timeframe, reason: setup.reason,
      strategies: setup.edges.join(', '),
      rsi: setup.rsi, macdValue: setup.macdHistogram, macdSignal: 0, macdHistogram: setup.macdHistogram,
      emaFast: 0, emaSlow: 0, emaSignal: 0,
      bollingerUpper: 0, bollingerMiddle: 0, bollingerLower: 0,
      atr: 0, volumeRatio: setup.volumeRatio, trend: '',
    };
    Promise.all([
      fetch(`${API}/api/signals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record) }),
      fetch(`${API}/api/user/signals`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oderId: id, userId: localStorage.getItem('cs_user_v2') ? JSON.parse(localStorage.getItem('cs_user_v2')!).id : 'anon', action: 'taken', timestamp: Date.now() })
      })
    ]).catch(() => {}).finally(() => { setTaken(true); setLoading(false); });
  }

  return (
    <div className={`bg-gray-900/60 rounded-xl p-4 border border-gray-800/40 border-l-4 ${riskColor}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className={`text-sm font-black px-2.5 py-1.5 rounded-lg ${setup.type === 'long' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
            {setup.type === 'long' ? 'LONG' : 'SHORT'}
          </span>
          <div>
            <div className="font-bold text-base">{setup.symbol}</div>
            <div className="flex items-center gap-2 text-[10px] text-gray-500">
              <span className="bg-gray-800 px-1.5 py-0.5 rounded font-mono">{setup.timeframe}</span>
              <span className={`uppercase font-bold ${setup.riskLevel === 'high' ? 'text-emerald-400' : setup.riskLevel === 'medium' ? 'text-yellow-400' : 'text-blue-400'}`}>
                {setup.riskLevel}
              </span>
              <span className="text-gray-700">|</span>
              <span>{formatAge(setup.timestamp)}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-black ${scoreColor}`}>{setup.convictionScore}</div>
          <div className="text-[10px] text-gray-600 uppercase tracking-widest">con vicci&#243;n</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="bg-gray-950/50 rounded-lg p-2 text-center">
          <div className="text-[10px] text-gray-600 uppercase mb-0.5">Entry</div>
          <div className="font-mono text-emerald-400 font-bold text-sm">{fmtPrice(setup.entryPrice)}</div>
        </div>
        <div className="bg-gray-950/50 rounded-lg p-2 text-center">
          <div className="text-[10px] text-gray-600 uppercase mb-0.5">SL</div>
          <div className="font-mono text-red-400 font-bold text-sm">{fmtPrice(setup.stopLoss)}</div>
          <div className="text-[10px] text-red-400">-{setup.slPct}%</div>
        </div>
        <div className="bg-gray-950/50 rounded-lg p-2 text-center">
          <div className="text-[10px] text-gray-600 uppercase mb-0.5">TP</div>
          <div className="font-mono text-blue-400 font-bold text-sm">{fmtPrice(setup.takeProfit)}</div>
          <div className="text-[10px] text-blue-400">+{setup.tpPct}%</div>
        </div>
        <div className="bg-gray-950/50 rounded-lg p-2 text-center">
          <div className="text-[10px] text-gray-600 uppercase mb-0.5">Lev</div>
          <div className={`font-black text-lg ${levColor}`}>{setup.leverageRecommendation}x</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {setup.edges.map((edge, i) => (
          <span key={i} className={`text-[10px] px-2 py-1 rounded-full border font-medium ${
            edge.includes('Fund') ? 'border-purple-500/50 text-purple-400 bg-purple-950/30' :
            edge.includes('EMA') ? 'border-blue-500/50 text-blue-400 bg-blue-950/30' :
            edge.includes('RSI') ? 'border-yellow-500/50 text-yellow-400 bg-yellow-950/30' :
            edge.includes('SHORT SQUEEZE') ? 'border-red-500/50 text-red-400 bg-red-950/30' :
            'border-gray-600/50 text-gray-400 bg-gray-900'
          }`}>
            {edge}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 text-[10px] text-gray-600 mb-3">
        <div>RSI: <span className={setup.rsi < 40 ? 'text-emerald-400' : setup.rsi > 60 ? 'text-red-400' : 'text-gray-400'}>{setup.rsi.toFixed(1)}</span></div>
        <div>Fund: <span className={Math.abs(setup.fundingRate) > 0.03 ? 'text-emerald-400' : 'text-gray-400'}>{setup.fundingRate?.toFixed(4)}%</span></div>
        <div>MACD: <span className={setup.macdHistogram > 0 ? 'text-emerald-400' : 'text-red-400'}>{setup.macdHistogram.toFixed(3)}</span></div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-800/40">
        <div className="text-[10px] text-gray-700">
          {new Date(setup.timestamp).toLocaleString('es', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </div>
        <button
          onClick={takeSignal}
          disabled={taken || loading}
          className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
            taken
              ? 'bg-gray-800 text-gray-600 cursor-default'
              : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/20'
          }`}
        >
          {loading ? '...' : taken ? '&#10003; Tomado' : 'Tomar Signal'}
        </button>
      </div>
    </div>
  );
}
