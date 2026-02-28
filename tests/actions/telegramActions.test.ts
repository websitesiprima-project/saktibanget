
// Mock process.env
const originalEnv = process.env;

beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.TELEGRAM_BOT_TOKEN = 'test_token';
    process.env.TELEGRAM_CHAT_ID = '123456789';
    global.fetch = jest.fn();
});

afterAll(() => {
    process.env = originalEnv;
});

describe('Telegram Actions', () => {
    describe('sendTelegramNotification', () => {
        it('should send a notification successfully', async () => {
            const { sendTelegramNotification } = await import('@/actions/telegramActions');
            (global.fetch as jest.Mock).mockResolvedValue({
                json: async () => ({ ok: true, result: {} }),
            });

            const result = await sendTelegramNotification('Test Message');

            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.telegram.org/bottest_token/sendMessage',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        chat_id: '123456789',
                        text: 'Test Message',
                        parse_mode: 'HTML'
                    })
                })
            );
            expect(result).toEqual({ success: true, data: { ok: true, result: {} } });
        });

        it('should return error if config is missing', async () => {
            delete process.env.TELEGRAM_BOT_TOKEN;
            const { sendTelegramNotification } = await import('@/actions/telegramActions');

            const result = await sendTelegramNotification('Fail');
            expect(result).toEqual({ success: false, error: 'Telegram configuration missing' });
        });

        it('should handle API errors', async () => {
            const { sendTelegramNotification } = await import('@/actions/telegramActions');
            (global.fetch as jest.Mock).mockResolvedValue({
                json: async () => ({ ok: false, description: 'Bad Request' }),
            });

            const result = await sendTelegramNotification('Test');
            expect(result).toEqual({ success: false, error: 'Bad Request' });
        });

        it('should handle network errors', async () => {
            const { sendTelegramNotification } = await import('@/actions/telegramActions');
            (global.fetch as jest.Mock).mockRejectedValue(new Error('Network Error'));
            const result = await sendTelegramNotification('Test');
            expect(result).toEqual({ success: false, error: 'Network error' });
        });
    });

    describe('sendTelegramWithButtons', () => {
        it('should send message with buttons', async () => {
            const { sendTelegramWithButtons } = await import('@/actions/telegramActions');
            (global.fetch as jest.Mock).mockResolvedValue({
                json: async () => ({ ok: true }),
            });

            const buttons = [[{ text: 'Yes', callback_data: 'yes' }]];
            await sendTelegramWithButtons('Vote', buttons);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('sendMessage'),
                expect.objectContaining({
                    body: expect.stringContaining('"inline_keyboard":[[{"text":"Yes","callback_data":"yes"}]]')
                })
            );
        });
    });

    describe('answerCallbackQuery', () => {
        it('should call answerCallbackQuery API', async () => {
            const { answerCallbackQuery } = await import('@/actions/telegramActions');
            await answerCallbackQuery('query_id', 'Done');
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('answerCallbackQuery'),
                expect.objectContaining({
                    body: expect.stringContaining('"callback_query_id":"query_id"')
                })
            );
        });
    });

    describe('editMessageText', () => {
        it('should call editMessageText API', async () => {
            const { editMessageText } = await import('@/actions/telegramActions');
            await editMessageText(123, 456, 'Updated');
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('editMessageText'),
                expect.objectContaining({
                    body: expect.stringContaining('"message_id":456')
                })
            );
        });
    });
});

