import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { Signal } from '../hooks/useSignalGenerator';

interface Props {
  signals: Signal[];
  leverage: 1 | 2 | 3 | 5;
}

export function EquityChart({ signals, leverage }: Props) {
  const data = useMemo(() => {
    const closed = signals
      .filter(s => s.status !== 'open')
      .sort((a, b) => a.timestamp - b.timestamp);

    if (closed.length === 0) return [];

    let equity = 100;
    return closed.map(s => {
      const pnl = s[`pnlPct${leverage}x` as keyof Signal] as number || 0;
      equity += pnl;
      return {
        date: new Date(s.timestamp).toLocaleDateString('es', { month: 'short', day: 'numeric' }),
        equity: Math.round(equity * 100) / 100
      };
    });
  }, [signals, leverage]);

  if (data.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 h-48 flex items-center justify-center">
        <span className="text-gray-500">Sin datos aún — las señales se generan automáticamente</span>
      </div>
    );
  }

  const start = data[0]?.equity || 100;
  const color = start <= data[data.length - 1]?.equity ? '#22c55e' : '#ef4444';

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300">Equity Curve {leverage}x</h3>
        <span className={`text-sm font-bold ${color}`}>
          {data.length > 0 ? `${((data[data.length - 1].equity - 100) / 100 * 100).toFixed(2)}%` : '0%'}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={data}>
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={v => `${v.toFixed(0)}%`} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', fontSize: 12 }}
            labelStyle={{ color: '#9ca3af' }}
            formatter={(v: number) => [`${v.toFixed(2)}%`, 'Equity']}
          />
          <Line type="monotone" dataKey="equity" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
