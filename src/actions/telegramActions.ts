'use server'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID

export async function sendTelegramNotification(message: string) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.warn('Telegram credentials not found in environment variables')
        return { success: false, error: 'Telegram configuration missing' }
    }

    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            }),
        })

        const data = await response.json()

        if (!data.ok) {
            console.error('Telegram API Error:', data)
            return { success: false, error: data.description }
        }

        return { success: true, data }
    } catch (error) {
        console.error('Failed to send Telegram notification:', error)
        return { success: false, error: 'Network error' }
    }
}

// Send message with Inline Buttons
export async function sendTelegramWithButtons(message: string, buttons: any[][]) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return { success: false, error: 'Config missing' }

    return await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: buttons
            }
        })
    }).then(res => res.json())
}

// Answer Callback Query (to stop loading animation on button click)
export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
    if (!TELEGRAM_BOT_TOKEN) return

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            callback_query_id: callbackQueryId,
            text: text
        })
    })
}

// Edit Message Text (to update status after button click)
export async function editMessageText(chatId: number, messageId: number, text: string) {
    if (!TELEGRAM_BOT_TOKEN) return

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: text,
            parse_mode: 'HTML'
        })
    })
}

// Send simple text reply (for commands)
export async function sendTelegramReply(chatId: number, text: string) {
    if (!TELEGRAM_BOT_TOKEN) return

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML'
        })
    })
}
