interface Props {
  stats: {
    total: number;
    won: number;
    lost: number;
    winRate: number;
    totalPnl1x: number;
    totalPnl5x: number;
  };
  leverage: 1 | 2 | 3 | 5;
}

export function StatsPanel({ stats, leverage }: Props) {
  const pnl = leverage >= 5 ? stats.totalPnl5x : stats.totalPnl1x * leverage;
  const pnlColor = pnl >= 0 ? 'text-green-400' : 'text-red-400';
  const pnlSign = pnl >= 0 ? '+' : '';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      <StatCard label="Total" value={stats.total.toString()} sub={`${stats.won}W / ${stats.lost}L`} />
      <StatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} color={stats.winRate >= 55 ? 'text-green-400' : 'text-red-400'} />
      <StatCard label={`P&L ${leverage}x`} value={`${pnlSign}${pnl.toFixed(2)}%`} color={pnlColor} />
      <StatCard label="Equity 1x" value={`${pnlSign}${stats.totalPnl1x.toFixed(2)}%`} color={stats.totalPnl1x >= 0 ? 'text-green-400' : 'text-red-400'} />
      <StatCard label="Equity 5x" value={`${pnlSign}${stats.totalPnl5x.toFixed(2)}%`} color={stats.totalPnl5x >= 0 ? 'text-green-400' : 'text-red-400'} />
      <StatCard label="Best" value={`${leverage}x`} sub="leverage" />
      <StatCard label="Edge" value="4" sub="confirmed" />
    </div>
  );
}

function StatCard({ label, value, sub, color = 'text-white' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}