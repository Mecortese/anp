import axios from 'axios';
import type { Kline } from '../types/index.js';

const FOREX_API = 'https://query1.finance.yahoo.com/v8/finance/chart';

interface CommodityData {
  symbol: string;
  price: number;
  change24h: number;
  name: string;
}

export class CommodityService {
  private cache: Map<string, { data: CommodityData; timestamp: number }> = new Map();
  private cacheDuration = 60 * 1000;

  async getGoldPrice(): Promise<CommodityData> {
    return this.getCommodityPrice('GC=F', 'XAUUSD', 'Gold');
  }

  async getOilPrice(): Promise<CommodityData> {
    return this.getCommodityPrice('CL=F', 'XTIUSD', 'Crude Oil');
  }

  private async getCommodityPrice(yahooSymbol: string, displaySymbol: string, name: string): Promise<CommodityData> {
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
      const quotes = result.timestamp.map((t: number, i: number) => ({
        time: t,
        close: result.indicators.quote[0].close[i]
      }));

      const currentPrice = meta.regularMarketPrice;
      const prevClose = quotes[quotes.length - 2]?.close || currentPrice;
      const change24h = ((currentPrice - prevClose) / prevClose) * 100;

      const data: CommodityData = {
        symbol: displaySymbol,
        price: currentPrice,
        change24h,
        name
      };

      this.cache.set(displaySymbol, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error(`[CommodityService] Error fetching ${displaySymbol}:`, error);
      return {
        symbol: displaySymbol,
        price: 0,
        change24h: 0,
        name
      };
    }
  }

  async getAllCommodities(): Promise<CommodityData[]> {
    const [gold, oil] = await Promise.all([
      this.getGoldPrice(),
      this.getOilPrice()
    ]);
    return [gold, oil];
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const commodityService = new CommodityService();