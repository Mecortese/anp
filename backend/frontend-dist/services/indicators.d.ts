import type { Kline, TechnicalIndicators } from '../types/index.js';
export declare class TechnicalAnalyzer {
    private static readonly EMA_PERIODS;
    static calculateAll(klines: Kline[]): TechnicalIndicators | null;
    static calculateRSI(closes: number[], period?: number): number;
    static calculateMACD(closes: number[]): {
        value: number;
        signal: number;
        histogram: number;
    };
    static calculateEMA(data: number[], period: number): number;
    static calculateBollingerBands(closes: number[], period?: number, stdDev?: number): {
        upper: number;
        middle: number;
        lower: number;
    };
    static calculateATR(klines: Kline[], period?: number): number;
}
