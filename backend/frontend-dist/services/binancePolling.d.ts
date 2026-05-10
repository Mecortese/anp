interface TickerData {
    symbol: string;
    name: string;
    price: number;
    change24h: number;
    volume24h: number;
}
export declare function fetchTickers(): Promise<TickerData[]>;
export declare function getTickers(): TickerData[];
export declare function getPollingStatus(): {
    lastUpdate: number;
    error: string;
    count: number;
};
export declare function startPolling(intervalMs?: number): Promise<void>;
export {};
