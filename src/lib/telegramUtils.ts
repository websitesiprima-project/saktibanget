// Telegram utility functions for use in API routes (no 'use server' directive)
// These are plain server-side helpers, not Server Actions.

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Answer Callback Query (to stop loading animation on button click)
export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
    if (!TELEGRAM_BOT_TOKEN) return;

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            callback_query_id: callbackQueryId,
            text: text,
        }),
    });
}

// Edit Message Text (to update status after button click)
export async function editMessageText(chatId: number, messageId: number, text: string) {
    if (!TELEGRAM_BOT_TOKEN) return;

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: text,
            parse_mode: 'HTML',
        }),
    });
}

// Send simple text reply (for commands)
export async function sendTelegramReply(chatId: number, text: string) {
    if (!TELEGRAM_BOT_TOKEN) return;

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML',
        }),
    });
}
