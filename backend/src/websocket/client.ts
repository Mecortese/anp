import { WebSocket, WebSocketServer } from 'ws';
import type { Signal, Asset } from '../types/index.js';

export class SignalWebSocket {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();

  constructor(port: number = 8080) {
    this.wss = new WebSocketServer({ port });
    this.setup();
  }

  private setup(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('[WS] Client connected');
      this.clients.add(ws);

      ws.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('[WS] Message parse error:', error);
        }
      });

      ws.on('close', () => {
        console.log('[WS] Client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('[WS] Client error:', error);
        this.clients.delete(ws);
      });

      ws.send(JSON.stringify({ type: 'connected', message: 'Connected to signal server' }));
    });

    console.log(`[WS] Server running on ws://localhost:${(this.wss as any).address().port}`);
  }

  private handleMessage(ws: WebSocket, data: any): void {
    switch (data.type) {
      case 'subscribe':
        ws.send(JSON.stringify({ 
          type: 'subscribed', 
          channels: data.channels || ['signals', 'tickers'] 
        }));
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
    }
  }

  broadcast(type: string, payload: any): void {
    const message = JSON.stringify({ type, payload, timestamp: Date.now() });
    
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  broadcastSignal(signal: Signal): void {
    this.broadcast('signal', signal);
  }

  broadcastTicker(ticker: any): void {
    this.broadcast('ticker', ticker);
  }

  broadcastPrice(symbol: string, price: number): void {
    this.broadcast('price', { symbol, price, timestamp: Date.now() });
  }

  getClientCount(): number {
    return this.clients.size;
  }

  close(): void {
    this.wss.close();
  }
}

let wsInstance: SignalWebSocket | null = null;

export function initWebSocket(port: number = 8080): SignalWebSocket {
  wsInstance = new SignalWebSocket(port);
  return wsInstance;
}

export function getWebSocket(): SignalWebSocket | null {
  return wsInstance;
}