import { createLogger, resetLogger } from 'c/logger';
import getClientSettings from '@salesforce/apex/LoggerController.getClientSettings';

jest.mock(
    '@salesforce/apex/LoggerController.getClientSettings',
    () => ({ __esModule: true, default: jest.fn() }),
    { virtual: true }
);

describe('c-logger', () => {
    beforeEach(() => {
        resetLogger();
        getClientSettings.mockReset();
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'info').mockImplementation(() => {});
        jest.spyOn(console, 'debug').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('writes errors to the console when enabled', async () => {
        getClientSettings.mockResolvedValue({ consoleEnabled: true, level: 'ERROR' });
        const logger = createLogger('cmp');
        await logger.error('boom', new Error('details'));
        expect(console.error).toHaveBeenCalledTimes(1);
        expect(console.error.mock.calls[0][0]).toBe('[cmp] boom: details');
    });

    it('stays silent when console logging is disabled', async () => {
        getClientSettings.mockResolvedValue({ consoleEnabled: false, level: 'DEBUG' });
        const logger = createLogger('cmp');
        await logger.error('boom');
        expect(console.error).not.toHaveBeenCalled();
    });

    it('respects the level threshold', async () => {
        getClientSettings.mockResolvedValue({ consoleEnabled: true, level: 'WARN' });
        const logger = createLogger('cmp');
        await logger.info('info');
        await logger.debug('debug');
        await logger.warn('warn');
        expect(console.info).not.toHaveBeenCalled();
        expect(console.debug).not.toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalledTimes(1);
    });

    it('falls back to console errors when settings cannot be loaded', async () => {
        getClientSettings.mockRejectedValue(new Error('no access'));
        const logger = createLogger('cmp');
        await logger.error('boom');
        await logger.info('ignored');
        expect(console.error).toHaveBeenCalledTimes(1);
        expect(console.info).not.toHaveBeenCalled();
    });

    it('loads settings only once', async () => {
        getClientSettings.mockResolvedValue({ consoleEnabled: true, level: 'DEBUG' });
        const logger = createLogger('cmp');
        await logger.debug('a');
        await logger.info('b');
        expect(getClientSettings).toHaveBeenCalledTimes(1);
        expect(console.debug).toHaveBeenCalledTimes(1);
        expect(console.info).toHaveBeenCalledTimes(1);
    });
});
