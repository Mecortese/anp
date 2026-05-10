export interface SignalRecord {
    id: string;
    timestamp: number;
    symbol: string;
    type: 'long' | 'short';
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    slPct: number;
    tpPct: number;
    confidence: number;
    timeframe: string;
    reason: string;
    strategies: string;
    rsi: number;
    macdValue: number;
    macdSignal: number;
    macdHistogram: number;
    emaFast: number;
    emaSlow: number;
    emaSignal: number;
    bollingerUpper: number;
    bollingerMiddle: number;
    bollingerLower: number;
    atr: number;
    volumeRatio: number;
    trend: string;
    status: 'open' | 'won' | 'lost' | 'cancelled';
    closedAt?: number;
    closedPrice?: number;
    pnlPct1x?: number;
    pnlPct2x?: number;
    pnlPct3x?: number;
    pnlPct5x?: number;
    exitReason?: string;
    createdAt?: number;
}
export interface SignalStats {
    total: number;
    won: number;
    lost: number;
    open: number;
    winRate: number;
    avgConfidence: number;
    totalPnl1x: number;
    totalPnl2x: number;
    totalPnl3x: number;
    totalPnl5x: number;
    bestSymbol: string;
    bestTimeframe: string;
    bestLeverage: string;
    byTimeframe: {
        timeframe: string;
        total: number;
        won: number;
        winRate: number;
        pnl1x: number;
        pnl5x: number;
    }[];
    bySymbol: {
        symbol: string;
        total: number;
        won: number;
        winRate: number;
        pnl1x: number;
        pnl5x: number;
    }[];
    byType: {
        type: string;
        total: number;
        won: number;
        winRate: number;
        pnl1x: number;
    }[];
    equityCurve: {
        date: string;
        equity1x: number;
        equity2x: number;
        equity5x: number;
    }[];
    monthlyStats: {
        month: string;
        signals: number;
        winRate: number;
        pnl1x: number;
        pnl5x: number;
    }[];
}
export declare const signalDb: {
    initialized: boolean;
    init(): Promise<void>;
    save(signal: SignalRecord): void;
    getAll(limit?: number): SignalRecord[];
    getBySymbol(symbol: string, limit?: number): SignalRecord[];
    getOpen(): SignalRecord[];
    updateStatus(id: string, status: string, closedPrice: number, pnlPct1x: number, exitReason: string): void;
    getStats(): SignalStats;
    getInt(sql: string): number;
    getFloat(sql: string): number;
    emptyStats(): SignalStats;
    parseResults(results: any[]): SignalRecord[];
    parseSimpleResults(results: any[]): any[];
};
