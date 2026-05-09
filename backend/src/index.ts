import { app, addSignal, updateAsset } from './routes/api.js';
import { SignalEngine } from './services/signals.js';
import { initWebSocket } from './websocket/client.js';
import { initTelegram } from './services/telegram.js';
import { signalDb } from './services/database.js';
import type { Signal } from './types/index.js';

const PORT = process.env.PORT || 3003;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

async function main() {
  console.log('🚀 Crypto Signals Server Starting...');

  await signalDb.init();

  const ws = initWebSocket(8080);
  
  const engine = new SignalEngine({
    minRSI: 28,
    maxRSI: 72,
    minConfidence: 60,
    signalCooldown: 30 * 60 * 1000
  });

  engine.on('signal', (signal: Signal) => {
    console.log(`[SIGNAL] ${signal.type.toUpperCase()} ${signal.symbol} @ $${signal.entryPrice}`);
    
    addSignal(signal);
    
    signalDb.save({
      id: signal.id,
      timestamp: signal.timestamp,
      symbol: signal.symbol,
      type: signal.type,
      entryPrice: signal.entryPrice,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      confidence: signal.confidence,
      timeframe: signal.timeframe,
      reason: signal.reason,
      rsi: signal.indicators?.rsi || 0,
      macdValue: signal.indicators?.macd?.value || 0,
      macdSignal: signal.indicators?.macd?.signal || 0,
      macdHistogram: signal.indicators?.macd?.histogram || 0,
      emaFast: 0,
      emaSlow: 0,
      emaSignal: 0,
      bollingerUpper: 0,
      bollingerMiddle: 0,
      bollingerLower: 0,
      atr: signal.indicators?.atr || 0,
      status: 'open'
    });
    
    ws.broadcastSignal(signal);

    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      const telegram = initTelegram(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID);
      telegram.sendSignal(signal);
    }
  });

  engine.on('ticker', (ticker: any) => {
    ws.broadcastTicker(ticker);
    
    updateAsset({
      symbol: ticker.symbol,
      name: ticker.symbol.replace('USDT', ''),
      price: ticker.price,
      change24h: ticker.change24h,
      volume24h: ticker.volume24h
    });

    const openSignals = signalDb.getOpen();
    openSignals.forEach(s => {
      const price = ticker.price;
      const symbolMatch = s.symbol.includes(ticker.symbol.replace('USDT', ''));
      
      if (symbolMatch) {
        if (s.type === 'long') {
          if (price <= s.stopLoss) {
            signalDb.updateStatus(s.id, 'lost', price, ((price - s.entryPrice) / s.entryPrice) * 100);
            console.log(`[CLOSED] ${s.symbol} LONG lost @ $${price}`);
          } else if (price >= s.takeProfit) {
            signalDb.updateStatus(s.id, 'won', price, ((price - s.entryPrice) / s.entryPrice) * 100);
            console.log(`[CLOSED] ${s.symbol} LONG won @ $${price}`);
          }
        } else {
          if (price >= s.stopLoss) {
            signalDb.updateStatus(s.id, 'lost', price, ((s.entryPrice - price) / s.entryPrice) * 100);
            console.log(`[CLOSED] ${s.symbol} SHORT lost @ $${price}`);
          } else if (price <= s.takeProfit) {
            signalDb.updateStatus(s.id, 'won', price, ((s.entryPrice - price) / s.entryPrice) * 100);
            console.log(`[CLOSED] ${s.symbol} SHORT won @ $${price}`);
          }
        }
      }
    });
  });

  engine.start();

  app.listen(PORT, () => {
    console.log(`[HTTP] Server on http://localhost:${PORT}`);
    console.log(`[WS] WebSocket on ws://localhost:8080`);
  });

  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    engine.stop();
    ws.close();
    process.exit(0);
  });
}

main().catch(console.error);