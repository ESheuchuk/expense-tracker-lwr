import { createElement } from 'lwc';
import AuthForgotPasswordForm from 'c/authForgotPasswordForm';
import forgotPassword from '@salesforce/apex/AuthController.forgotPassword';

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
    '@salesforce/apex/AuthController.forgotPassword',
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
    const element = createElement('c-auth-forgot-password-form', { is: AuthForgotPasswordForm });
    document.body.appendChild(element);
    return element;
}

describe('c-auth-forgot-password-form', () => {
    beforeEach(() => {
        forgotPassword.mockReset();
        mockNavigate.mockReset();
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
        cleanDom();
    });

    it('sends the email and shows a neutral confirmation', async () => {
        forgotPassword.mockResolvedValue();
        const element = setup();
        fill(element, 'email', 'ann@example.com');
        submit(element);
        await flushPromises();

        expect(forgotPassword).toHaveBeenCalledWith({ request: { email: 'ann@example.com' } });
        expect(element.shadowRoot.querySelector('.form__success').textContent).toBe(
            'c.Forgot_Success'
        );
        expect(element.shadowRoot.querySelector('form')).toBeNull();
    });

    it('shows the server error and keeps the form', async () => {
        forgotPassword.mockRejectedValue({
            body: { message: 'Please enter a valid email address.' }
        });
        const element = setup();
        fill(element, 'email', 'bad');
        submit(element);
        await flushPromises();

        expect(element.shadowRoot.querySelector('.form__error').textContent).toBe(
            'Please enter a valid email address.'
        );
        expect(element.shadowRoot.querySelector('form')).not.toBeNull();
    });

    it('does not call Apex when the email is invalid', async () => {
        const element = setup();
        submit(element, false);
        await flushPromises();
        expect(forgotPassword).not.toHaveBeenCalled();
    });

    it('links back to login', async () => {
        const element = setup();
        await flushPromises();
        const link = element.shadowRoot.querySelector('a[data-id="login"]');
        expect(link.getAttribute('href')).toBe('/Login');
        link.click();
        expect(mockNavigate).toHaveBeenCalledWith({
            type: 'comm__namedPage',
            attributes: { name: 'Login' }
        });
    });
});
