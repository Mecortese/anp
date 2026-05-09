# Crypto Signals

Sistema de detección de señales de trading en tiempo real para criptomonedas.

## Características

- Streaming de datos en vivo desde Binance WebSocket
- Indicadores técnicos: RSI, MACD, EMA, Bollinger Bands, ATR
- Detección automática de entradas LONG/SHORT
- Dashboard web en tiempo real
- Notificaciones Telegram
- Soporte para Oro y Petróleo (víaforex)

## Stack

- **Backend**: Node.js, TypeScript, Express, WebSocket
- **Frontend**: React, TypeScript, TailwindCSS, Recharts
- **Data**: Binance WebSocket API (gratis)

## Inicio Rápido

### 1. Clonar y configurar

```bash
cd crypto-signals
cp .env.example .env
```

### 2. Configurar Telegram (opcional)

1. Crea un bot via [@BotFather](https://t.me/BotFather)
2. Obtén el token del bot
3. Crea un grupo/canal y obtén el chat_id

### 3. Ejecutar con Docker

```bash
docker-compose up -d
```

### 4. Ejecutar localmente

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (en otra terminal)
cd frontend
npm install
npm run dev
```

## Endpoints API

- `GET /api/health` - Estado del servidor
- `GET /api/signals` - Lista de señales
- `GET /api/assets` - Lista de activos con precios

## WebSocket Events

Conecta a `ws://localhost:8080` para recibir:
- `signal` - Nueva señal detectada
- `ticker` - Actualización de precio

## Configuración de Señales

Edita `src/services/signals.ts` para ajustar:

- `minRSI` / `maxRSI` - Umbrales RSI (default: 28/72)
- `minConfidence` - Confianza mínima % (default: 60%)
- `signalCooldown` - Tiempo entre señales del mismo activo (default: 30min)
- `atrMultiplier` - Multiplicador ATR para SL/TP (default: 1.5)