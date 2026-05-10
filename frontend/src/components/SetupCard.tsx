import type { TradeSetup } from '../hooks/useTradingSetups';

interface Props {
  setup: TradeSetup;
  leverage: 1 | 2 | 3 | 5;
}

const fmtPrice = (p: number) =>
  p >= 1000 ? `$${p.toLocaleString('es', { maximumFractionDigits: 2 })}`
  : p >= 1 ? `$${p.toFixed(4)}` : `$${p.toFixed(6)}`;

export function SetupCard({ setup, leverage }: Props) {
  const pnlKey = `pnlPct${leverage}x` as keyof typeof setup;
  const pnl = (setup as any)[pnlKey] as number | undefined;

  const riskColor = setup.riskLevel === 'high' ? 'border-l-green-500' : setup.riskLevel === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500';
  const scoreColor = setup.convictionScore >= 80 ? 'text-green-400' : setup.convictionScore >= 65 ? 'text-yellow-400' : 'text-gray-400';
  const levColor = setup.leverageRecommendation >= 5 ? 'text-green-400' : setup.leverageRecommendation >= 3 ? 'text-yellow-400' : 'text-white';

  return (
    <div className={`bg-gray-900 rounded-lg p-4 border border-gray-800 border-l-4 ${riskColor}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className={`text-2xl font-bold ${setup.type === 'long' ? 'text-green-400' : 'text-red-400'}`}>
            {setup.type === 'long' ? '📈' : '📉'}
          </span>
          <div>
            <div className="font-bold text-lg">{setup.symbol}</div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="bg-gray-800 px-1.5 py-0.5 rounded">{setup.timeframe}</span>
              <span className={`${setup.riskLevel === 'high' ? 'text-green-400' : setup.riskLevel === 'medium' ? 'text-yellow-400' : 'text-blue-400'} uppercase font-bold`}>
                {setup.riskLevel} risk
              </span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className={`text-3xl font-bold ${scoreColor}`}>{setup.convictionScore}</div>
          <div className="text-xs text-gray-500">conviction</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-3">
        <div>
          <div className="text-xs text-gray-500">Entry</div>
          <div className="font-mono text-green-400 font-semibold">{fmtPrice(setup.entryPrice)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Stop Loss</div>
          <div className="font-mono text-red-400 font-semibold">{fmtPrice(setup.stopLoss)}</div>
          <div className="text-xs text-red-400">-{setup.slPct}%</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Take Profit</div>
          <div className="font-mono text-blue-400 font-semibold">{fmtPrice(setup.takeProfit)}</div>
          <div className="text-xs text-blue-400">+{setup.tpPct}%</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Leverage</div>
          <div className={`font-bold text-xl ${levColor}`}>{setup.leverageRecommendation}x</div>
          <div className="text-xs text-gray-500">recomendado</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-2">
        {setup.edges.map((edge, i) => (
          <span key={i} className={`text-xs px-2 py-0.5 rounded border ${
            edge.includes('Funding') ? 'border-purple-500 text-purple-400 bg-purple-900/20' :
            edge.includes('EMA') ? 'border-blue-500 text-blue-400 bg-blue-900/20' :
            edge.includes('RSI') ? 'border-yellow-500 text-yellow-400 bg-yellow-900/20' :
            'border-gray-600 text-gray-400 bg-gray-800'
          }`}>
            {edge}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
        <div>RSI: <span className={setup.rsi < 40 ? 'text-green-400' : setup.rsi > 60 ? 'text-red-400' : 'text-white'}>{setup.rsi.toFixed(1)}</span></div>
        <div>Funding: <span className={setup.fundingRate < -0.03 ? 'text-green-400' : setup.fundingRate > 0.03 ? 'text-red-400' : 'text-white'}>{setup.fundingRate?.toFixed(4)}%</span></div>
        <div>MACD: <span className={setup.macdHistogram > 0 ? 'text-green-400' : 'text-red-400'}>{setup.macdHistogram.toFixed(4)}</span></div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-between">
        <div className="text-xs text-gray-600">
          {new Date(setup.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className={`text-sm font-bold ${(pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {pnl !== undefined ? `${(pnl || 0) >= 0 ? '+' : ''}${pnl.toFixed(2)}%` : 'En curso'}
        </div>
      </div>
    </div>
  );
}