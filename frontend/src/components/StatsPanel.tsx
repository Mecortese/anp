import type { Signal } from '../hooks/useSignalGenerator';

interface Props {
  signals: Signal[];
  leverage: 1 | 2 | 3 | 5;
}

function pnl(signals: Signal[], lev: number, status: string) {
  return signals
    .filter(s => s.status === status)
    .reduce((sum, s) => sum + (s[`pnlPct${lev}x` as keyof Signal] as number || 0), 0);
}

function winRate(signals: Signal[]) {
  const won = signals.filter(s => s.status === 'won').length;
  return signals.length ? Math.round((won / signals.length) * 100) : 0;
}

export function StatsPanel({ signals, leverage }: Props) {
  const closed = signals.filter(s => s.status !== 'open');
  const open = signals.filter(s => s.status === 'open');
  const won = closed.filter(s => s.status === 'won').length;
  const lost = closed.filter(s => s.status === 'lost').length;
  const wr = closed.length ? Math.round((won / closed.length) * 100) : 0;

  const totalPnl = closed.reduce((sum, s) => sum + (s[`pnlPct${leverage}x` as keyof Signal] as number || 0), 0);
  const maxWin = Math.max(0, ...closed.filter(s => s.status === 'won').map(s => s[`pnlPct${leverage}x` as keyof Signal] as number || 0));
  const maxLoss = Math.min(0, ...closed.filter(s => s.status === 'lost').map(s => s[`pnlPct${leverage}x` as keyof Signal] as number || 0));

  const bySymbol: Record<string, { total: number; won: number }> = {};
  for (const s of closed) {
    if (!bySymbol[s.symbol]) bySymbol[s.symbol] = { total: 0, won: 0 };
    bySymbol[s.symbol].total++;
    if (s.status === 'won') bySymbol[s.symbol].won++;
  }

  const bestSymbol = Object.entries(bySymbol).sort((a, b) => {
    const wrA = a[1].won / a[1].total;
    const wrB = b[1].won / b[1].total;
    return wrB - wrA;
  })[0];

  const pnlColor = totalPnl >= 0 ? 'text-green-400' : 'text-red-400';
  const pnlSign = totalPnl >= 0 ? '+' : '';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      <StatCard label="Total" value={closed.length.toString()} sub={`${open.length} abiertas`} />
      <StatCard label="Ganadas" value={won.toString()} sub={`${wr}% winrate`} color="text-green-400" />
      <StatCard label="Perdidas" value={lost.toString()} sub={closed.length ? `${Math.round((lost / closed.length) * 100)}%` : '-'} color="text-red-400" />
      <StatCard label={`P&L ${leverage}x`} value={`${pnlSign}${totalPnl.toFixed(2)}%`} sub={`${bestSymbol ? bestSymbol[0] : '-'} mejor`} color={pnlColor} />
      <StatCard label="Mejor" value={`+${maxWin.toFixed(2)}%`} color="text-green-400" />
      <StatCard label="Peor" value={`${maxLoss.toFixed(2)}%`} color="text-red-400" />
      <StatCard label={`Equity ${leverage}x`} value={`${pnlSign}${(100 + totalPnl).toFixed(2)}%`} color={pnlColor} />
    </div>
  );
}

function StatCard({ label, value, sub, color = 'text-white' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}
