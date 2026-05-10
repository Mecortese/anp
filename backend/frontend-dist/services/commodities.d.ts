interface CommodityData {
    symbol: string;
    price: number;
    change24h: number;
    name: string;
}
export declare class CommodityService {
    private cache;
    private cacheDuration;
    getGoldPrice(): Promise<CommodityData>;
    getOilPrice(): Promise<CommodityData>;
    private getCommodityPrice;
    getAllCommodities(): Promise<CommodityData[]>;
    clearCache(): void;
}
export declare const commodityService: CommodityService;
export {};
