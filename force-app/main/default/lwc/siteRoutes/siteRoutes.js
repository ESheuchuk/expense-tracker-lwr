import basePath from '@salesforce/community/basePath';

/** Named LWR pages (route apiNames) used for in-site navigation via NavigationMixin. */
export const PAGES = Object.freeze({
    HOME: 'Home',
    LOGIN: 'Login',
    REGISTER: 'Register',
    WELCOME: 'Welcome__c',
    FORGOT_PASSWORD: 'Forgot_Password'
});

export function namedPage(name) {
    return { type: 'comm__namedPage', attributes: { name } };
}

/**
 * True for a plain left click. Modified clicks (new tab/window) are left to the browser,
 * which uses the link's real href.
 */
export function isPlainLeftClick(event) {
    return (
        event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
    );
}

/** Logout needs a full page load: it ends the server session. */
export function logout() {
    window.location.assign(`${basePath}/secur/logout.jsp`);
}

/** Auth redirects need a full page load so the new session cookie is picked up. */
export function redirect(url) {
    window.location.assign(url);
}
