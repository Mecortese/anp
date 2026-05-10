import axios from 'axios';
const BINANCE_API = 'https://api.binance.com/api/v3/ticker/24hr';
const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
let cachedTickers = [];
let lastUpdate = 0;
let pollingError = '';
let fetchInProgress = false;
export async function fetchTickers() {
    if (fetchInProgress) {
        console.log('[Polling] Already in progress, returning cache');
        return cachedTickers;
    }
    fetchInProgress = true;
    console.log('[Polling] Starting fetch for', SYMBOLS.length, 'symbols');
    const results = [];
    for (const symbol of SYMBOLS) {
        try {
            console.log('[Polling] Fetching', symbol);
            const response = await axios.get(BINANCE_API, {
                params: { symbol },
                timeout: 8000,
                headers: { 'Accept': 'application/json' }
            });
            const data = response.data;
            console.log('[Polling] Got', symbol, 'price:', data.lastPrice);
            results.push({
                symbol: data.symbol,
                name: data.symbol.replace('USDT', ''),
                price: parseFloat(data.lastPrice) || 0,
                change24h: parseFloat(data.priceChangePercent) || 0,
                volume24h: parseFloat(data.quoteVolume) || 0
            });
        }
        catch (error) {
            console.error('[Polling] Error for', symbol, ':', error.message);
        }
    }
    cachedTickers = results;
    lastUpdate = Date.now();
    console.log('[Polling] Done. Total tickers:', results.length);
    fetchInProgress = false;
    return cachedTickers;
}
export function getTickers() {
    console.log('[Polling] getTickers called, returning', cachedTickers.length, 'tickers');
    return cachedTickers;
}
export function getPollingStatus() {
    return { lastUpdate, error: pollingError, count: cachedTickers.length };
}
export async function startPolling(intervalMs = 15000) {
    console.log('[Polling] startPolling called');
    await fetchTickers();
    setInterval(fetchTickers, intervalMs);
}
