import { LightningElement, api } from 'lwc';
import SHOW_PASSWORD from '@salesforce/label/c.Login_Show_Password';
import HIDE_PASSWORD from '@salesforce/label/c.Login_Hide_Password';
import REQUIRED from '@salesforce/label/c.Common_Validation_Required';

/**
 * Password field with a show/hide toggle inside the input (SLDS "input with icon" pattern,
 * same look as lightning-input). Mirrors the lightning-input API used by the forms:
 * name, value, change event, reportValidity(), setCustomValidity().
 */
export default class PasswordInput extends LightningElement {
    @api label;
    @api name;
    @api autocomplete = 'current-password';
    @api required = false;
    @api messageWhenValueMissing = REQUIRED;

    isVisible = false;
    errorMessage = '';
    customError = '';
    currentValue = '';

    labels = { required: REQUIRED };

    @api
    get value() {
        return this.currentValue;
    }
    set value(newValue) {
        this.currentValue = newValue ?? '';
    }

    @api
    setCustomValidity(message) {
        this.customError = message || '';
    }

    @api
    checkValidity() {
        return this.validationMessage() === '';
    }

    @api
    reportValidity() {
        this.errorMessage = this.validationMessage();
        return this.errorMessage === '';
    }

    get inputType() {
        return this.isVisible ? 'text' : 'password';
    }

    get toggleIcon() {
        return this.isVisible ? 'utility:hide' : 'utility:preview';
    }

    get toggleLabel() {
        return this.isVisible ? HIDE_PASSWORD : SHOW_PASSWORD;
    }

    get ariaPressed() {
        return String(this.isVisible);
    }

    get ariaInvalid() {
        return String(this.errorMessage !== '');
    }

    get formElementClass() {
        return this.errorMessage ? 'slds-form-element slds-has-error' : 'slds-form-element';
    }

    handleInput(event) {
        this.currentValue = event.target.value;
        if (this.errorMessage) {
            this.reportValidity();
        }
        this.dispatchEvent(new CustomEvent('change', { detail: { value: this.currentValue } }));
    }

    handleBlur() {
        if (this.currentValue) {
            this.reportValidity();
        }
    }

    handleToggle() {
        this.isVisible = !this.isVisible;
    }

    validationMessage() {
        if (this.required && !this.currentValue) {
            return this.messageWhenValueMissing;
        }
        return this.customError;
    }
}
