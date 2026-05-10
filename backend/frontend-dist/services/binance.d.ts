import { EventEmitter } from 'events';
export declare class BinanceWebSocket extends EventEmitter {
    private ws;
    private symbols;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    private heartbeatInterval;
    constructor(symbols?: string[]);
    connect(): void;
    private handleMessage;
    private parseKline;
    private startHeartbeat;
    private stopHeartbeat;
    private reconnect;
    disconnect(): void;
    getStatus(): {
        connected: boolean;
        symbols: string[];
    };
}
export declare const SYMBOLS: {
    CRYPTO: string[];
};
