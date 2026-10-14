import getClientSettings from '@salesforce/apex/LoggerController.getClientSettings';
import { reduceErrors } from 'c/errorUtils';

const LEVEL_ORDER = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const CONSOLE_METHOD = { DEBUG: 'debug', INFO: 'info', WARN: 'warn', ERROR: 'error' };
const FALLBACK_SETTINGS = { consoleEnabled: true, level: 'ERROR' };

let settingsPromise;

/**
 * Loads Logger_Setting__mdt once (imperative Apex call, no @wire) and caches the promise.
 * On failure the logger falls back to "console on, ERROR only" so errors are never swallowed.
 */
function loadSettings() {
    if (!settingsPromise) {
        settingsPromise = getClientSettings()
            .then((settings) => ({ ...FALLBACK_SETTINGS, ...settings }))
            .catch(() => FALLBACK_SETTINGS);
    }
    return settingsPromise;
}

function write(level, source, message, error) {
    return loadSettings().then((settings) => {
        const threshold = LEVEL_ORDER[settings.level] ?? LEVEL_ORDER.ERROR;
        if (!settings.consoleEnabled || LEVEL_ORDER[level] < threshold) {
            return;
        }
        const text = `[${source}] ${message}`;
        if (error === undefined) {
            console[CONSOLE_METHOD[level]](text);
        } else {
            console[CONSOLE_METHOD[level]](`${text}: ${reduceErrors(error)}`, error);
        }
    });
}

/**
 * Creates a logger bound to a source name (usually the component name).
 * All methods return a promise that resolves once the entry has been processed.
 */
export function createLogger(source) {
    return {
        error: (message, error) => write('ERROR', source, message, error),
        warn: (message, error) => write('WARN', source, message, error),
        info: (message, error) => write('INFO', source, message, error),
        debug: (message, error) => write('DEBUG', source, message, error)
    };
}

/** Test helper: forgets cached settings. */
export function resetLogger() {
    settingsPromise = undefined;
}
