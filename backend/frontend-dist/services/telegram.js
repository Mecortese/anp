import axios from 'axios';
export class TelegramService {
    botToken;
    chatId;
    apiUrl;
    constructor(botToken, chatId) {
        this.botToken = botToken;
        this.chatId = chatId;
        this.apiUrl = `https://api.telegram.org/bot${botToken}`;
    }
    async sendSignal(signal) {
        const emoji = signal.type === 'long' ? '🟢' : '🔴';
        const typeText = signal.type === 'long' ? 'LONG' : 'SHORT';
        const message = `
${emoji} *NUEVA SEÑAL ${typeText}*

📊 *Par:* ${signal.symbol}
⏰ *Timeframe:* ${signal.timeframe}
💰 *Entrada:* $${signal.entryPrice.toFixed(6)}
🛑 *Stop Loss:* $${signal.stopLoss.toFixed(6)}
🎯 *Take Profit:* $${signal.takeProfit.toFixed(6)}
📈 *Confianza:* ${signal.confidence}%
📝 *Razón:* ${signal.reason}
    `.trim();
        await this.sendMessage(message);
    }
    async sendMessage(text) {
        try {
            await axios.post(`${this.apiUrl}/sendMessage`, {
                chat_id: this.chatId,
                text,
                parse_mode: 'Markdown'
            });
        }
        catch (error) {
            console.error('[Telegram] Error sending message:', error);
        }
    }
    async sendAlert(title, message) {
        await this.sendMessage(`🔔 *${title}*\n\n${message}`);
    }
    async setWebhook(url) {
        try {
            await axios.post(`${this.apiUrl}/setWebhook`, { url });
            console.log('[Telegram] Webhook set successfully');
        }
        catch (error) {
            console.error('[Telegram] Error setting webhook:', error);
        }
    }
    async getMe() {
        try {
            const response = await axios.get(`${this.apiUrl}/getMe`);
            return response.data;
        }
        catch (error) {
            console.error('[Telegram] Error getting bot info:', error);
            return null;
        }
    }
}
let telegramInstance = null;
export function initTelegram(token, chatId) {
    telegramInstance = new TelegramService(token, chatId);
    return telegramInstance;
}
export function getTelegram() {
    return telegramInstance;
}
