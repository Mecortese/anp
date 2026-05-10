import { useState } from 'react';
import type { TradeSetup } from '../hooks/useTradingSetups';

interface Props {
  setup: TradeSetup;
  leverage?: 1 | 2 | 3 | 5;
}

const BACKEND = 'https://crypto-signals-idfn.onrender.com';

const fmtPrice = (p: number) =>
  p >= 1000 ? `$${p.toLocaleString('es', { maximumFractionDigits: 2 })}`
  : p >= 1 ? `$${p.toFixed(4)}` : `$${p.toFixed(6)}`;

export function SetupCard({ setup, leverage = 1 }: Props) {
  const [taken, setTaken] = useState(setup.taken || false);

  const riskColor = setup.riskLevel === 'high'
    ? 'border-l-emerald-500'
    : setup.riskLevel === 'medium'
    ? 'border-l-yellow-500'
    : 'border-l-blue-500';
  const scoreColor = setup.convictionScore >= 80 ? 'text-emerald-400' : setup.convictionScore >= 65 ? 'text-yellow-400' : 'text-gray-400';
  const levColor = setup.leverageRecommendation >= 5 ? 'text-emerald-400' : setup.leverageRecommendation >= 3 ? 'text-yellow-400' : 'text-white';

  function takeSignal() {
    if (taken) return;
    const id = `sig-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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
    fetch(`${BACKEND}/api/signals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record) }).catch(() => {});
    const userId = localStorage.getItem('cs_user_v2') ? JSON.parse(localStorage.getItem('cs_user_v2')!).id : 'anon';
    fetch(`${BACKEND}/api/user/signals`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oderId: id, userId, action: 'taken', timestamp: Date.now() })
    }).catch(() => {});
    setTaken(true);
  }

  return (
    <div className={`bg-gray-900/80 backdrop-blur rounded-xl p-4 border border-gray-800/50 border-l-4 ${riskColor} ${taken ? 'opacity-50' : 'hover:border-gray-700/80 transition-colors'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className={`text-2xl font-bold ${setup.type === 'long' ? 'text-emerald-400' : 'text-red-400'}`}>
            {setup.type === 'long' ? '&#128200;' : '&#128201;'}
          </span>
          <div>
            <div className="font-bold text-base">{setup.symbol}</div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="bg-gray-800 px-1.5 py-0.5 rounded">{setup.timeframe}</span>
              <span className={`uppercase font-bold text-[10px] ${setup.riskLevel === 'high' ? 'text-emerald-400' : setup.riskLevel === 'medium' ? 'text-yellow-400' : 'text-blue-400'}`}>
                {setup.riskLevel}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-black ${scoreColor}`}>{setup.convictionScore}</div>
          <div className="text-[10px] text-gray-600 uppercase tracking-widest">convicci&#243;n</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="bg-gray-950/50 rounded-lg p-2">
          <div className="text-[10px] text-gray-600 uppercase">Entry</div>
          <div className="font-mono text-emerald-400 font-bold text-sm">{fmtPrice(setup.entryPrice)}</div>
        </div>
        <div className="bg-gray-950/50 rounded-lg p-2">
          <div className="text-[10px] text-gray-600 uppercase">SL</div>
          <div className="font-mono text-red-400 font-bold text-sm">{fmtPrice(setup.stopLoss)}</div>
          <div className="text-[10px] text-red-400">-{setup.slPct}%</div>
        </div>
        <div className="bg-gray-950/50 rounded-lg p-2">
          <div className="text-[10px] text-gray-600 uppercase">TP</div>
          <div className="font-mono text-blue-400 font-bold text-sm">{fmtPrice(setup.takeProfit)}</div>
          <div className="text-[10px] text-blue-400">+{setup.tpPct}%</div>
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

      <div className="grid grid-cols-3 gap-2 text-[11px] text-gray-600 mb-3">
        <div>RSI: <span className={setup.rsi < 40 ? 'text-emerald-400' : setup.rsi > 60 ? 'text-red-400' : 'text-gray-400'}>{setup.rsi.toFixed(1)}</span></div>
        <div>Fund: <span className={Math.abs(setup.fundingRate) > 0.03 ? 'text-emerald-400' : 'text-gray-400'}>{setup.fundingRate?.toFixed(4)}%</span></div>
        <div>MACD: <span className={setup.macdHistogram > 0 ? 'text-emerald-400' : 'text-red-400'}>{setup.macdHistogram.toFixed(3)}</span></div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-800/40">
        <div className="text-[10px] text-gray-700">
          {new Date(setup.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
          <span className="ml-2 text-gray-800">|</span>
          <span className="ml-2">Lev: <span className={levColor}>{setup.leverageRecommendation}x</span></span>
        </div>
        <button
          onClick={takeSignal}
          disabled={taken}
          className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
            taken
              ? 'bg-gray-800 text-gray-600 cursor-default'
              : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40'
          }`}
        >
          {taken ? '&#10003; Tomado' : 'Tomar Signal'}
        </button>
      </div>
    </div>
  );
}
