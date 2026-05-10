import type { Signal } from '../types/index.js';
export declare class TelegramService {
    private botToken;
    private chatId;
    private apiUrl;
    constructor(botToken: string, chatId: string);
    sendSignal(signal: Signal): Promise<void>;
    sendMessage(text: string): Promise<void>;
    sendAlert(title: string, message: string): Promise<void>;
    setWebhook(url: string): Promise<void>;
    getMe(): Promise<any>;
}
export declare function initTelegram(token: string, chatId: string): TelegramService;
export declare function getTelegram(): TelegramService | null;
