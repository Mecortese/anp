import { app } from './routes/api.js';
import { signalDb } from './services/database.js';
import { userSignalsRouter } from './routes/userSignals.js';
import { mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
  mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
} else {
  mkdirSync(path.join(__dirname, '../data'), { recursive: true });
}

const PORT = parseInt(process.env.PORT || '3000');

async function main() {
  console.log('Crypto Signals Server Starting...');
  await signalDb.init();

  app.use(userSignalsRouter());

  http.createServer(app).listen(PORT, '0.0.0.0', () => {
    console.log(`Server on port ${PORT}`);
  });
}

main().catch(console.error);
