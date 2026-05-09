import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import type { Ticker } from '../types';

interface MiniChartProps {
  symbol: string;
  price: number;
  change: number;
}

export const MiniChart: React.FC<MiniChartProps> = ({ symbol, price, change }) => {
  const [data, setData] = useState<{ time: string; price: number }[]>([]);

  useEffect(() => {
    const mockData = Array.from({ length: 24 }, (_, i) => ({
      time: `${i}:00`,
      price: price * (0.98 + Math.random() * 0.04 + (change >= 0 ? i * 0.001 : -i * 0.001))
    }));
    setData(mockData);
  }, [price, change]);

  const color = change >= 0 ? '#22c55e' : '#ef4444';

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="font-bold">{symbol.replace('USDT', '')}</span>
        <span className={change >= 0 ? 'text-green-400' : 'text-red-400'}>
          {change >= 0 ? '+' : ''}{change.toFixed(2)}%
        </span>
      </div>
      <div className="h-20">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`gradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke={color} 
              strokeWidth={2} 
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};