import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { signalDb } from '../services/database.js';
import { commodityService } from '../services/commodities.js';
import { fetchTickers, getTickers, getPollingStatus } from '../services/binancePolling.js';
import { readdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';
const cwd = process.cwd();

const possiblePaths = [
  path.join(cwd, 'frontend-dist'),
  path.join(cwd, 'backend', 'frontend-dist'),
  path.join(cwd, '..', 'frontend-dist'),
  path.join(__dirname, '../../frontend/dist'),
  path.join(__dirname, '../../../frontend-dist'),
];

let frontendDistPath = '';
for (const p of possiblePaths) {
  if (existsSync(path.join(p, 'index.html'))) {
    frontendDistPath = p;
    break;
  }
}

if (!frontendDistPath) {
  frontendDistPath = path.join(cwd, 'frontend-dist');
}

console.log('[SERVER] CWD:', cwd);
console.log('[SERVER] Frontend dist path:', frontendDistPath);
console.log('[SERVER] Index exists:', existsSync(path.join(frontendDistPath, 'index.html')));

const app = express();
app.use(cors());
app.use(express.json());