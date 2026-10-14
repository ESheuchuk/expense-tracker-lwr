import { createElement } from 'lwc';
import AuthLoginForm from 'c/authLoginForm';
import login from '@salesforce/apex/AuthController.login';

const mockNavigate = jest.fn();
jest.mock(
    'lightning/navigation',
    () => {
        const Navigate = Symbol('Navigate');
        const GenerateUrl = Symbol('GenerateUrl');
        const NavigationMixin = (Base) =>
            class extends Base {
                [Navigate](reference) {
                    mockNavigate(reference);
                }

                [GenerateUrl](reference) {
                    return Promise.resolve(`/${reference.attributes.name}`);
                }
            };
        NavigationMixin.Navigate = Navigate;
        NavigationMixin.GenerateUrl = GenerateUrl;
        return { NavigationMixin };
    },
    { virtual: true }
);

jest.mock('@salesforce/community/basePath', () => ({ __esModule: true, default: '/vforcesite' }), {
    virtual: true
});
jest.mock(
    '@salesforce/apex/LoggerController.getClientSettings',
    () => ({
        __esModule: true,
        default: jest.fn(() => Promise.resolve({ consoleEnabled: false, level: 'ERROR' }))
    }),
    { virtual: true }
);

jest.mock(
    '@salesforce/apex/AuthController.login',
    () => ({ __esModule: true, default: jest.fn() }),
    { virtual: true }
);

// Drain the microtask queue: the handlers under test await several chained promises
const flushPromises = () => new Promise(jest.requireActual('timers').setImmediate);

function inputByName(element, name) {
    return [...element.shadowRoot.querySelectorAll('lightning-input, c-password-input')].find(
        (input) => input.name === name
    );
}

function fill(element, name, value) {
    const input = inputByName(element, name);
    input.value = value;
    input.dispatchEvent(new CustomEvent('change'));
}

function submit(element, valid = true) {
    // The lightning-input stub does not implement reportValidity()
    element.shadowRoot.querySelectorAll('lightning-input, c-password-input').forEach((input) => {
        input.reportValidity = jest.fn(() => valid);
    });
    element.shadowRoot
        .querySelector('form')
        .dispatchEvent(new CustomEvent('submit', { cancelable: true }));
}

function cleanDom() {
    while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
    }
}

function setup() {
    const element = createElement('c-auth-login-form', { is: AuthLoginForm });
    document.body.appendChild(element);
    return element;
}

describe('c-auth-login-form', () => {
    const originalLocation = window.location;

    beforeEach(() => {
        delete window.location;
        window.location = { assign: jest.fn(), search: '?startURL=%2Fwelcome' };
        login.mockReset();
        mockNavigate.mockReset();
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        window.location = originalLocation;
        jest.restoreAllMocks();
        cleanDom();
    });

    it('logs in and redirects with a full page load', async () => {
        login.mockResolvedValue({ redirectUrl: '/frontdoor?x=1' });
        const element = setup();
        fill(element, 'email', 'a@b.com');
        fill(element, 'password', 'secret');
        submit(element);
        await flushPromises();

        expect(login).toHaveBeenCalledWith({
            request: { email: 'a@b.com', password: 'secret', startUrl: '/welcome' }
        });
        expect(window.location.assign).toHaveBeenCalledWith('/frontdoor?x=1');
    });

    it('shows the server error and does not redirect', async () => {
        login.mockRejectedValue({ body: { message: 'Incorrect email or password.' } });
        const element = setup();
        fill(element, 'email', 'a@b.com');
        fill(element, 'password', 'bad');
        submit(element);
        await flushPromises();

        expect(element.shadowRoot.querySelector('.form__error').textContent).toBe(
            'Incorrect email or password.'
        );
        expect(window.location.assign).not.toHaveBeenCalled();
    });

    it('does not call Apex when the form is invalid', async () => {
        const element = setup();
        submit(element, false);
        await flushPromises();
        expect(login).not.toHaveBeenCalled();
    });

    it('navigates to registration and forgot password', () => {
        const element = setup();
        element.shadowRoot.querySelector('a[data-id="register"]').click();
        element.shadowRoot.querySelector('a[data-id="forgot"]').click();
        expect(mockNavigate).toHaveBeenNthCalledWith(1, {
            type: 'comm__namedPage',
            attributes: { name: 'Register' }
        });
        expect(mockNavigate).toHaveBeenNthCalledWith(2, {
            type: 'comm__namedPage',
            attributes: { name: 'Forgot_Password' }
        });
    });

    it('renders real hrefs for its links', async () => {
        const element = setup();
        await flushPromises();
        expect(element.shadowRoot.querySelector('a[data-id="register"]').getAttribute('href')).toBe(
            '/Register'
        );
        expect(element.shadowRoot.querySelector('a[data-id="forgot"]').getAttribute('href')).toBe(
            '/Forgot_Password'
        );
    });

    it('leaves modified clicks (new tab) to the browser', () => {
        const element = setup();
        element.shadowRoot
            .querySelector('a[data-id="register"]')
            .dispatchEvent(new MouseEvent('click', { button: 0, ctrlKey: true, cancelable: true }));
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});
