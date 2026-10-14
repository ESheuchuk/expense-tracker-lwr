import { createElement } from 'lwc';
import SiteHeader from 'c/siteHeader';

function setup(isGuest) {
    const element = createElement('c-site-header', { is: SiteHeader });
    element.isGuest = isGuest;
    document.body.appendChild(element);
    return element;
}

describe('c-site-header', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('shows login and register for guests and emits events', () => {
        const element = setup(true);
        const login = jest.fn();
        const register = jest.fn();
        element.addEventListener('login', login);
        element.addEventListener('register', register);
        element.shadowRoot.querySelector('[data-id="login"]').click();
        element.shadowRoot.querySelector('[data-id="register"]').click();
        expect(login).toHaveBeenCalledTimes(1);
        expect(register).toHaveBeenCalledTimes(1);
        expect(element.shadowRoot.querySelector('[data-id="logout"]')).toBeNull();
    });

    it('shows open app and logout for authenticated users', () => {
        const element = setup(false);
        const logout = jest.fn();
        const openApp = jest.fn();
        element.addEventListener('logout', logout);
        element.addEventListener('openapp', openApp);
        element.shadowRoot.querySelector('[data-id="logout"]').click();
        element.shadowRoot.querySelector('[data-id="openApp"]').click();
        expect(logout).toHaveBeenCalledTimes(1);
        expect(openApp).toHaveBeenCalledTimes(1);
        expect(element.shadowRoot.querySelector('[data-id="login"]')).toBeNull();
    });

    it('emits home when the brand is clicked', () => {
        const element = setup(true);
        const home = jest.fn();
        element.addEventListener('home', home);
        element.shadowRoot.querySelector('.header__brand').click();
        expect(home).toHaveBeenCalledTimes(1);
    });
});
