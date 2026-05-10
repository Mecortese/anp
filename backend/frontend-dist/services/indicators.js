export class TechnicalAnalyzer {
    static EMA_PERIODS = {
        fast: 12,
        slow: 26,
        signal: 9
    };
    static calculateAll(klines) {
        if (klines.length < 50)
            return null;
        const closes = klines.map(k => k.close);
        return {
            rsi: this.calculateRSI(closes),
            macd: this.calculateMACD(closes),
            ema_fast: this.calculateEMA(closes, this.EMA_PERIODS.fast),
            ema_slow: this.calculateEMA(closes, this.EMA_PERIODS.slow),
            ema_signal: this.calculateEMA(closes, this.EMA_PERIODS.signal),
            bollinger: this.calculateBollingerBands(closes),
            atr: this.calculateATR(klines)
        };
    }
    static calculateRSI(closes, period = 14) {
        if (closes.length < period + 1)
            return 50;
        let gains = 0;
        let losses = 0;
        for (let i = closes.length - period; i < closes.length; i++) {
            const change = closes[i] - closes[i - 1];
            if (change > 0)
                gains += change;
            else
                losses += Math.abs(change);
        }
        const avgGain = gains / period;
        const avgLoss = losses / period;
        if (avgLoss === 0)
            return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }
    static calculateMACD(closes) {
        const ema12 = this.calculateEMA(closes, 12);
        const ema26 = this.calculateEMA(closes, 26);
        const macdLine = ema12 - ema26;
        const macdValues = closes.map((_, i) => {
            if (i < 26)
                return 0;
            const subset = closes.slice(0, i + 1);
            return this.calculateEMA(subset, 12) - this.calculateEMA(subset, 26);
        }).filter(v => v !== 0);
        const signalLine = this.calculateEMA(macdValues, 9);
        const histogram = macdLine - signalLine;
        return { value: macdLine, signal: signalLine, histogram };
    }
    static calculateEMA(data, period) {
        if (data.length < period)
            return data[data.length - 1] || 0;
        const k = 2 / (period + 1);
        let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
        for (let i = period; i < data.length; i++) {
            ema = data[i] * k + ema * (1 - k);
        }
        return ema;
    }
    static calculateBollingerBands(closes, period = 20, stdDev = 2) {
        if (closes.length < period) {
            const lastPrice = closes[closes.length - 1];
            return { upper: lastPrice, middle: lastPrice, lower: lastPrice };
        }
        const subset = closes.slice(-period);
        const sma = subset.reduce((a, b) => a + b, 0) / period;
        const squaredDiffs = subset.map(v => Math.pow(v - sma, 2));
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
        const standardDeviation = Math.sqrt(variance);
        return {
            upper: sma + (standardDeviation * stdDev),
            middle: sma,
            lower: sma - (standardDeviation * stdDev)
        };
    }
    static calculateATR(klines, period = 14) {
        if (klines.length < period + 1)
            return 0;
        const trueRanges = [];
        for (let i = 1; i < klines.length; i++) {
            const high = klines[i].high;
            const low = klines[i].low;
            const prevClose = klines[i - 1].close;
            const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
            trueRanges.push(tr);
        }
        return trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
    }
}
