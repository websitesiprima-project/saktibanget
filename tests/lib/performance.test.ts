import { debounce, throttle, getCachedData, setCachedData, clearCache } from '@/lib/performance';

jest.useFakeTimers();

describe('performance lib', () => {
    describe('debounce', () => {
        it('should delay function execution', () => {
            const func = jest.fn();
            const debouncedFunc = debounce(func, 1000);

            debouncedFunc('test');
            expect(func).not.toHaveBeenCalled();

            jest.advanceTimersByTime(500);
            expect(func).not.toHaveBeenCalled();

            jest.advanceTimersByTime(500);
            expect(func).toHaveBeenCalledWith('test');
        });

        it('should reset timer on subsequent calls', () => {
            const func = jest.fn();
            const debouncedFunc = debounce(func, 1000);

            debouncedFunc();
            jest.advanceTimersByTime(500);
            debouncedFunc();
            jest.advanceTimersByTime(500);
            expect(func).not.toHaveBeenCalled();

            jest.advanceTimersByTime(500);
            expect(func).toHaveBeenCalledTimes(1);
        });
    });

    describe('throttle', () => {
        it('should limit function execution frequency', () => {
            const func = jest.fn();
            const throttledFunc = throttle(func, 1000);

            throttledFunc();
            expect(func).toHaveBeenCalledTimes(1);

            throttledFunc();
            expect(func).toHaveBeenCalledTimes(1); // Should be ignored

            jest.advanceTimersByTime(1000);
            throttledFunc();
            expect(func).toHaveBeenCalledTimes(2);
        });
    });

    describe('caching', () => {
        beforeEach(() => {
            clearCache();
        });

        it('should cache and retrieve data', () => {
            setCachedData('key', 'value');
            expect(getCachedData('key')).toBe('value');
        });

        it('should return null for non-existent key', () => {
            expect(getCachedData('missing')).toBeNull();
        });

        it('should expire data after duration', () => {
            setCachedData('key', 'value');

            // Advance time past 60000ms (1 minute)
            const RealDate = Date;
            const now = Date.now();
            global.Date.now = jest.fn(() => now + 65000);

            try {
                expect(getCachedData('key')).toBeNull();
            } finally {
                global.Date.now = RealDate.now;
            }
        });
    });
});
