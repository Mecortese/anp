import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, AreaChartProps } from 'recharts';
import type { Signal } from '../types';

interface SignalChartProps {
  signals: Signal[];
}

export const SignalChart: React.FC<SignalChartProps> = ({ signals }) => {
  const [timeframe, setTimeframe] = useState<'1h' | '24h' | '7d'>('24h');

  const chartData = signals.slice(0, 20).map((s, i) => ({
    name: new Date(s.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    long: s.type === 'long' ? s.confidence : 0,
    short: s.type === 'short' ? s.confidence : 0,
    index: i
  })).reverse();

  const timeframes = [
    { key: '1h', label: '1H' },
    { key: '24h', label: '24H' },
    { key: '7d', label: '7D' }
  ];

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">Señales por Confianza</h3>
        <div className="flex gap-2">
          {timeframes.map((tf) => (
            <button
              key={tf.key}
              onClick={() => setTimeframe(tf.key as any)}
              className={`px-3 py-1 rounded text-sm ${
                timeframe === tf.key 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorLong" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorShort" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="name" 
              stroke="#6b7280"
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              axisLine={{ stroke: '#374151' }}
            />
            <YAxis 
              stroke="#6b7280"
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              axisLine={{ stroke: '#374151' }}
              domain={[0, 100]}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1f2937', 
                border: 'none', 
                borderRadius: '8px',
                color: '#fff'
              }}
            />
            <Area
              type="monotone"
              dataKey="long"
              stackId="1"
              stroke="#22c55e"
              fill="url(#colorLong)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="short"
              stackId="2"
              stroke="#ef4444"
              fill="url(#colorShort)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-sm text-gray-400">Long ({signals.filter(s => s.type === 'long').length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-sm text-gray-400">Short ({signals.filter(s => s.type === 'short').length})</span>
        </div>
      </div>
    </div>
  );
};