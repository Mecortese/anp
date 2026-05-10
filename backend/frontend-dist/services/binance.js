import WebSocket from 'ws';
import { EventEmitter } from 'events';
const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws';
export class BinanceWebSocket extends EventEmitter {
    ws = null;
    symbols;
    reconnectAttempts = 0;
    maxReconnectAttempts = 10;
    reconnectDelay = 3000;
    heartbeatInterval = null;
    constructor(symbols = []) {
        super();
        this.symbols = symbols.map(s => s.toLowerCase());
    }
    connect() {
        if (this.ws?.readyState === WebSocket.OPEN) {
            return;
        }
        const streams = this.symbols.flatMap(symbol => [
            `${symbol}@kline_1m`,
            `${symbol}@kline_5m`,
            `${symbol}@kline_15m`,
            `${symbol}@kline_1h`,
            `${symbol}@kline_4h`,
            `${symbol}@kline_1d`,
            `${symbol}@ticker`
        ]);
        const wsUrl = `${BINANCE_WS_URL}/${streams.join('/')}`;
        this.ws = new WebSocket(wsUrl);
        this.ws.on('open', () => {
            console.log('[BinanceWS] Connected');
            this.reconnectAttempts = 0;
            this.startHeartbeat();
        });
        this.ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                this.handleMessage(message);
            }
            catch (error) {
                console.error('[BinanceWS] Parse error:', error);
            }
        });
        this.ws.on('close', () => {
            console.log('[BinanceWS] Disconnected');
            this.stopHeartbeat();
            this.reconnect();
        });
        this.ws.on('error', (error) => {
            console.error('[BinanceWS] Error:', error.message);
        });
    }
    handleMessage(message) {
        if (message.e === 'kline') {
            const kline = this.parseKline(message);
            this.emit('kline', message.s, message.k.i, kline);
            this.emit(`kline:${message.s}:${message.k.i}`, kline);
        }
        else if (message.e === '24hrTicker') {
            this.emit('ticker', {
                symbol: message.s,
                price: parseFloat(message.c),
                change24h: parseFloat(message.P),
                volume24h: parseFloat(message.v),
                high24h: parseFloat(message.h),
                low24h: parseFloat(message.l)
            });
        }
    }
    parseKline(data) {
        return {
            time: data.k.t,
            open: parseFloat(data.k.o),
            high: parseFloat(data.k.h),
            low: parseFloat(data.k.l),
            close: parseFloat(data.k.c),
            volume: parseFloat(data.k.v),
            isClosed: data.k.x
        };
    }
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.ping();
            }
        }, 30000);
    }
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    reconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[BinanceWS] Max reconnection attempts reached');
            return;
        }
        this.reconnectAttempts++;
        console.log(`[BinanceWS] Reconnecting in ${this.reconnectDelay / 1000}s (attempt ${this.reconnectAttempts})`);
        setTimeout(() => this.connect(), this.reconnectDelay);
    }
    disconnect() {
        this.stopHeartbeat();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
    getStatus() {
        return {
            connected: this.ws?.readyState === WebSocket.OPEN,
            symbols: this.symbols
        };
    }
}
export const SYMBOLS = {
    CRYPTO: [
        'btcusdt', 'ethusdt', 'bnbusdt', 'solusdt', 'xrpusdt',
        'adausdt', 'dogeusdt', 'avaxusdt', 'dotusdt', 'maticusdt',
        'linkusdt', 'ltcusdt', 'uniusdt', 'atomusdt', 'etcusdt',
        'xlmusdt', 'nearusdt', 'algousdt', 'mkrusdt', 'aaveusdt'
    ]
};
