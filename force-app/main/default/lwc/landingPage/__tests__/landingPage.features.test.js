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

describe('c-landing-page content', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('renders the hero, three features and the footer', () => {
        const element = createElement('c-landing-page', { is: LandingPage });
        document.body.appendChild(element);
        const list = element.shadowRoot.querySelector('c-feature-list');
        expect(list.features).toHaveLength(3);
        expect(element.shadowRoot.querySelector('c-hero-section')).not.toBeNull();
        expect(element.shadowRoot.querySelector('c-site-footer')).not.toBeNull();
    });
});
