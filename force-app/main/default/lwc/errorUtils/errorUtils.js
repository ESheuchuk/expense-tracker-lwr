/**
 * Normalizes Apex / LWC / JS errors into a single readable string.
 * @param {*} error Apex error ({body:{message}}), JS Error, string or array of those
 * @returns {string}
 */
export function reduceErrors(error) {
    if (error === null || error === undefined) {
        return 'Unknown error';
    }
    if (Array.isArray(error)) {
        return error.map((item) => reduceErrors(item)).join('; ');
    }
    if (typeof error === 'string') {
        return error;
    }
    if (Array.isArray(error.body)) {
        return error.body.map((item) => item.message).join('; ');
    }
    if (error.body && typeof error.body.message === 'string') {
        return error.body.message;
    }
    if (typeof error.message === 'string') {
        return error.message;
    }
    return 'Unknown error';
}
