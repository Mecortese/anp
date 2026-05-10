import { WebSocket, WebSocketServer } from 'ws';
export class SignalWebSocket {
    wss;
    clients = new Set();
    httpServer;
    constructor(server) {
        this.httpServer = server;
        this.wss = new WebSocketServer({ noServer: true });
        this.setup();
        this.handleUpgrade();
    }
    handleUpgrade() {
        this.httpServer.on('upgrade', (request, socket, head) => {
            const url = request.url || '';
            if (url.startsWith('/ws')) {
                this.wss.handleUpgrade(request, socket, head, (ws) => {
                    this.wss.emit('connection', ws, request);
                });
            }
            else {
                socket.destroy();
            }
        });
    }
    setup() {
        this.wss.on('connection', (ws) => {
            console.log('[WS] Client connected');
            this.clients.add(ws);
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message.toString());
                    this.handleMessage(ws, data);
                }
                catch (error) {
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
    handleMessage(ws, data) {
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
    broadcast(type, payload) {
        const message = JSON.stringify({ type, payload, timestamp: Date.now() });
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }
    broadcastSignal(signal) {
        this.broadcast('signal', signal);
    }
    broadcastTicker(ticker) {
        this.broadcast('ticker', ticker);
    }
    getClientCount() {
        return this.clients.size;
    }
    close() {
        this.wss.close();
    }
}
let wsInstance = null;
export function initWebSocket(server) {
    wsInstance = new SignalWebSocket(server);
    return wsInstance;
}
export function getWebSocket() {
    return wsInstance;
}
