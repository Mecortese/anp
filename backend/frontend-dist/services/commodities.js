import axios from 'axios';
const FOREX_API = 'https://query1.finance.yahoo.com/v8/finance/chart';
export class CommodityService {
    cache = new Map();
    cacheDuration = 60 * 1000;
    async getGoldPrice() {
        return this.getCommodityPrice('GC=F', 'XAUUSD', 'Gold');
    }
    async getOilPrice() {
        return this.getCommodityPrice('CL=F', 'XTIUSD', 'Crude Oil');
    }
    async getCommodityPrice(yahooSymbol, displaySymbol, name) {
        const cached = this.cache.get(displaySymbol);
        if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
            return cached.data;
        }
        try {
            const response = await axios.get(`${FOREX_API}/${yahooSymbol}`, {
                params: { interval: '1d', range: '2d' },
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const result = response.data.chart.result[0];
            const meta = result.meta;
            const quotes = result.timestamp.map((t, i) => ({
                time: t,
                close: result.indicators.quote[0].close[i]
            }));
            const currentPrice = meta.regularMarketPrice;
            const prevClose = quotes[quotes.length - 2]?.close || currentPrice;
            const change24h = ((currentPrice - prevClose) / prevClose) * 100;
            const data = {
                symbol: displaySymbol,
                price: currentPrice,
                change24h,
                name
            };
            this.cache.set(displaySymbol, { data, timestamp: Date.now() });
            return data;
        }
        catch (error) {
            console.error(`[CommodityService] Error fetching ${displaySymbol}:`, error);
            return {
                symbol: displaySymbol,
                price: 0,
                change24h: 0,
                name
            };
        }
    }
    async getAllCommodities() {
        const [gold, oil] = await Promise.all([
            this.getGoldPrice(),
            this.getOilPrice()
        ]);
        return [gold, oil];
    }
    clearCache() {
        this.cache.clear();
    }
}
export const commodityService = new CommodityService();
