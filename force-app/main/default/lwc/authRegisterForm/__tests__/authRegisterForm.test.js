import { createElement } from 'lwc';
import AuthRegisterForm from 'c/authRegisterForm';
import register from '@salesforce/apex/AuthController.register';

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
    '@salesforce/apex/AuthController.register',
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
    const element = createElement('c-auth-register-form', { is: AuthRegisterForm });
    document.body.appendChild(element);
    return element;
}

function fillAll(element, confirm = 'Passw0rd!x') {
    fill(element, 'firstName', 'Ann');
    fill(element, 'lastName', 'Smith');
    fill(element, 'email', 'ann@example.com');
    fill(element, 'password', 'Passw0rd!x');
    fill(element, 'confirmPassword', confirm);
}

describe('c-auth-register-form', () => {
    const originalLocation = window.location;

    beforeEach(() => {
        delete window.location;
        window.location = { assign: jest.fn(), search: '' };
        register.mockReset();
        mockNavigate.mockReset();
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        window.location = originalLocation;
        jest.restoreAllMocks();
        cleanDom();
    });

    it('registers and redirects with a full page load', async () => {
        register.mockResolvedValue({ redirectUrl: '/frontdoor?welcome' });
        const element = setup();
        fillAll(element);
        submit(element);
        await flushPromises();

        expect(register).toHaveBeenCalledWith({
            request: {
                firstName: 'Ann',
                lastName: 'Smith',
                email: 'ann@example.com',
                password: 'Passw0rd!x',
                confirmPassword: 'Passw0rd!x'
            }
        });
        expect(window.location.assign).toHaveBeenCalledWith('/frontdoor?welcome');
    });

    it('sets a custom validity on the confirm field when passwords differ', () => {
        const element = setup();
        fillAll(element, 'different');
        const confirm = inputByName(element, 'confirmPassword');
        confirm.setCustomValidity = jest.fn();
        submit(element);
        expect(confirm.setCustomValidity).toHaveBeenCalledWith('c.Auth_Error_Password_Mismatch');
    });

    it('shows the server error', async () => {
        register.mockRejectedValue({
            body: { message: 'An account with this email already exists.' }
        });
        const element = setup();
        fillAll(element);
        submit(element);
        await flushPromises();

        expect(element.shadowRoot.querySelector('.form__error').textContent).toBe(
            'An account with this email already exists.'
        );
        expect(window.location.assign).not.toHaveBeenCalled();
    });

    it('navigates to login', () => {
        const element = setup();
        element.shadowRoot.querySelector('a[data-id="login"]').click();
        expect(mockNavigate).toHaveBeenCalledWith({
            type: 'comm__namedPage',
            attributes: { name: 'Login' }
        });
    });
});
