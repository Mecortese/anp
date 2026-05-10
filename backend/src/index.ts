import { app, fetchTickers } from './routes/api.js';
import { signalDb } from './services/database.js';
import { mkdirSync, existsSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isProd = process.env.NODE_ENV === 'production';

function getDataDir() {
  if (isProd) {
    const cwd = process.cwd();
    const dataPath = path.join(cwd, 'data');
    mkdirSync(dataPath, { recursive: true });
    return dataPath;
  }
  const dataPath = path.join(__dirname, '../data');
  mkdirSync(dataPath, { recursive: true });
  return dataPath;
}

const dataDir = getDataDir();
console.log('[SERVER] CWD:', process.cwd());
console.log('[SERVER] Data dir:', dataDir);

const PORT = parseInt(process.env.PORT || '3000');

async function main() {
  console.log('🚀 Crypto Signals Server Starting...');

  await signalDb.init();
  console.log('[DB] SQLite ready');

  const server = http.createServer(app);

  server.listen(PORT, '0.0.0.0', async () => {
    console.log(`[HTTP] Server on port ${PORT}`);
    console.log('[POLLING] Starting Binance ticker polling...');
    await fetchTickers();
  });

  setInterval(async () => {
    await fetchTickers();
  }, 15000);

  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    server.close();
    process.exit(0);
  });
}

main().catch(console.error);