import { WebSocket, WebSocketServer } from 'ws';
import type { Server } from 'http';
import type { Signal, Asset } from '../types/index.js';

export class SignalWebSocket {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private httpServer: Server;

  constructor(server: Server) {
    this.httpServer = server;
    this.wss = new WebSocketServer({ noServer: true });
    this.setup();
    this.handleUpgrade();
  }

  private handleUpgrade(): void {
    this.httpServer.on('upgrade', (request, socket, head) => {
      const url = request.url || '';
      
      if (url.startsWith('/ws')) {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });
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

    console.log('[WS] WebSocket server ready');
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

  getClientCount(): number {
    return this.clients.size;
  }

  close(): void {
    this.wss.close();
  }
}

let wsInstance: SignalWebSocket | null = null;

export function initWebSocket(server: Server): SignalWebSocket {
  wsInstance = new SignalWebSocket(server);
  return wsInstance;
}

export function getWebSocket(): SignalWebSocket | null {
  return wsInstance;
}