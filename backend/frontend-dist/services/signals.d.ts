import { EventEmitter } from 'events';
interface SignalConfig {
    minRSI: number;
    maxRSI: number;
    minConfidence: number;
    atrMultiplier: number;
    signalCooldown: number;
}
export declare class SignalEngine extends EventEmitter {
    private ws;
    private klines;
    private signalHistory;
    private config;
    constructor(config?: Partial<SignalConfig>);
    start(): void;
    private handleKline;
    private shouldAnalyze;
    private analyzeAndEmit;
    private detectSignal;
    private calculateConfidence;
    private isLongSignal;
    private isShortSignal;
    private buildLongReason;
    private buildShortReason;
    getAssets(): any[];
    private getAssetName;
    stop(): void;
}
export {};
