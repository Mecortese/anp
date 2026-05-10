import type { Server } from 'http';
import type { Signal } from '../types/index.js';
export declare class SignalWebSocket {
    private wss;
    private clients;
    private httpServer;
    constructor(server: Server);
    private handleUpgrade;
    private setup;
    private handleMessage;
    broadcast(type: string, payload: any): void;
    broadcastSignal(signal: Signal): void;
    broadcastTicker(ticker: any): void;
    getClientCount(): number;
    close(): void;
}
export declare function initWebSocket(server: Server): SignalWebSocket;
export declare function getWebSocket(): SignalWebSocket | null;
