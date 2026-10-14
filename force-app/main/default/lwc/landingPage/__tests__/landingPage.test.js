import { createElement } from 'lwc';
import LandingPage from 'c/landingPage';

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

function setup() {
    const element = createElement('c-landing-page', { is: LandingPage });
    document.body.appendChild(element);
    return element;
}

describe('c-landing-page', () => {
    const originalLocation = window.location;

    beforeEach(() => {
        delete window.location;
        window.location = { assign: jest.fn(), search: '' };
        mockNavigate.mockReset();
    });

    afterEach(() => {
        window.location = originalLocation;
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('navigates to login and register from the header events', () => {
        const element = setup();
        const header = element.shadowRoot.querySelector('c-site-header');
        header.dispatchEvent(new CustomEvent('login'));
        header.dispatchEvent(new CustomEvent('register'));
        header.dispatchEvent(new CustomEvent('home'));
        header.dispatchEvent(new CustomEvent('openapp'));
        expect(mockNavigate.mock.calls.map((call) => call[0].attributes.name)).toEqual([
            'Login',
            'Register',
            'Home',
            'Welcome__c'
        ]);
    });

    it('logs out with a full page load', () => {
        const element = setup();
        element.shadowRoot.querySelector('c-site-header').dispatchEvent(new CustomEvent('logout'));
        expect(window.location.assign).toHaveBeenCalledWith('/vforcesite/secur/logout.jsp');
    });
});
