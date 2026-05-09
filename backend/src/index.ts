import { app, polling } from './routes/api.js';
import { initTelegram } from './services/telegram.js';
import { signalDb } from './services/database.js';
import type { Signal } from './types/index.js';
import { mkdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.NODE_ENV === 'production' 
  ? path.join(process.cwd(), 'data')
  : path.join(__dirname, '../data');
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

const PORT = parseInt(process.env.PORT || '3000');
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

async function main() {
  console.log('🚀 Crypto Signals Server Starting...');

  await signalDb.init();
  console.log('[DB] SQLite ready');

  polling.start(5000);
  console.log('[POLLING] Binance HTTP polling started');

  const server = http.createServer(app);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[HTTP] Server on http://0.0.0.0:${PORT}`);
  });

  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    polling.stop();
    server.close();
    process.exit(0);
  });
}

main().catch(console.error);