import { createElement } from 'lwc';
import HeroSection from 'c/heroSection';

describe('c-hero-section', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('shows the call to action for guests only', () => {
        const element = createElement('c-hero-section', { is: HeroSection });
        element.isGuest = true;
        document.body.appendChild(element);
        const cta = jest.fn();
        element.addEventListener('cta', cta);
        element.shadowRoot.querySelector('lightning-button').click();
        expect(cta).toHaveBeenCalledTimes(1);
    });

    it('hides the call to action for authenticated users', () => {
        const element = createElement('c-hero-section', { is: HeroSection });
        element.isGuest = false;
        document.body.appendChild(element);
        expect(element.shadowRoot.querySelector('lightning-button')).toBeNull();
    });
});
