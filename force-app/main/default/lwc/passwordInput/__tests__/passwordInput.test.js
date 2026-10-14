import { createElement } from 'lwc';
import PasswordInput from 'c/passwordInput';

function setup(props = {}) {
    const element = createElement('c-password-input', { is: PasswordInput });
    Object.assign(element, { label: 'Password', name: 'password', ...props });
    document.body.appendChild(element);
    return element;
}

describe('c-password-input', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('keeps the toggle inside the input container and switches visibility', async () => {
        const element = setup();
        const control = element.shadowRoot.querySelector('.slds-input-has-icon_right');
        const input = control.querySelector('input');
        const toggle = control.querySelector('button');
        expect(input.type).toBe('password');
        expect(toggle.getAttribute('aria-pressed')).toBe('false');

        toggle.click();
        await Promise.resolve();
        expect(input.type).toBe('text');
        expect(toggle.getAttribute('aria-pressed')).toBe('true');
    });

    it('emits change with the typed value and exposes it via value', () => {
        const element = setup();
        const handler = jest.fn();
        element.addEventListener('change', handler);
        const input = element.shadowRoot.querySelector('input');
        input.value = 'secret';
        input.dispatchEvent(new CustomEvent('input'));
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0][0].detail.value).toBe('secret');
        expect(element.value).toBe('secret');
    });

    it('reports a missing required value', async () => {
        const element = setup({ required: true, messageWhenValueMissing: 'Required!' });
        expect(element.reportValidity()).toBe(false);
        await Promise.resolve();
        expect(element.shadowRoot.querySelector('.slds-form-element__help').textContent).toBe(
            'Required!'
        );
        expect(element.shadowRoot.querySelector('.slds-has-error')).not.toBeNull();
    });

    it('supports custom validity', async () => {
        const element = setup({ value: 'abc' });
        element.setCustomValidity('Passwords do not match.');
        expect(element.checkValidity()).toBe(false);
        element.setCustomValidity('');
        expect(element.reportValidity()).toBe(true);
        await Promise.resolve();
        expect(element.shadowRoot.querySelector('.slds-form-element__help')).toBeNull();
    });
});
