import React from 'react';
import { Activity, Signal, Wifi, WifiOff } from 'lucide-react';

interface HeaderProps {
  connected: boolean;
  signalCount: number;
}

export const Header: React.FC<HeaderProps> = ({ connected, signalCount }) => {
  return (
    <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-purple-500" />
          <h1 className="text-xl font-bold">Crypto Signals Pro</h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Signal className="w-5 h-5 text-gray-400" />
            <span className="text-gray-400">
              {signalCount} señales hoy
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {connected ? (
              <>
                <Wifi className="w-5 h-5 text-green-500" />
                <span className="text-green-500">Conectado</span>
              </>
            ) : (
              <>
                <WifiOff className="w-5 h-5 text-red-500" />
                <span className="text-red-500">Desconectado</span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};