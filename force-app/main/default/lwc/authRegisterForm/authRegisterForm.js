import { LightningElement } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import register from '@salesforce/apex/AuthController.register';
import { createLogger } from 'c/logger';
import { reduceErrors } from 'c/errorUtils';
import { PAGES, namedPage, redirect, isPlainLeftClick } from 'c/siteRoutes';
import TITLE from '@salesforce/label/c.Register_Title';
import FIRST_NAME from '@salesforce/label/c.Register_First_Name';
import LAST_NAME from '@salesforce/label/c.Register_Last_Name';
import EMAIL from '@salesforce/label/c.Login_Email';
import PASSWORD from '@salesforce/label/c.Login_Password';
import CONFIRM_PASSWORD from '@salesforce/label/c.Register_Confirm_Password';
import SUBMIT from '@salesforce/label/c.Register_Submit';
import HAVE_ACCOUNT from '@salesforce/label/c.Register_Have_Account';
import LOGIN_LINK from '@salesforce/label/c.Nav_Login';
import LOADING from '@salesforce/label/c.Common_Loading';
import REQUIRED from '@salesforce/label/c.Common_Validation_Required';
import PASSWORD_MISMATCH from '@salesforce/label/c.Auth_Error_Password_Mismatch';

const logger = createLogger('authRegisterForm');

/** Registration container: owns the Apex call and form state. */
export default class AuthRegisterForm extends NavigationMixin(LightningElement) {
    firstName = '';
    lastName = '';
    email = '';
    password = '';
    confirmPassword = '';
    errorMessage = '';
    isLoading = false;
    loginUrl;

    labels = {
        title: TITLE,
        firstName: FIRST_NAME,
        lastName: LAST_NAME,
        email: EMAIL,
        password: PASSWORD,
        confirmPassword: CONFIRM_PASSWORD,
        submit: SUBMIT,
        haveAccount: HAVE_ACCOUNT,
        loginLink: LOGIN_LINK,
        loading: LOADING,
        required: REQUIRED
    };

    connectedCallback() {
        this[NavigationMixin.GenerateUrl](namedPage(PAGES.LOGIN)).then((url) => {
            this.loginUrl = url;
        });
    }

    handleChange(event) {
        this[event.target.name] = event.target.value;
    }

    handleLogin(event) {
        if (!isPlainLeftClick(event)) {
            return;
        }
        event.preventDefault();
        this[NavigationMixin.Navigate](namedPage(PAGES.LOGIN));
    }

    async handleSubmit(event) {
        event.preventDefault();
        this.errorMessage = '';
        if (!this.isValid() || this.isLoading) {
            return;
        }
        this.isLoading = true;
        try {
            const result = await register({
                request: {
                    firstName: this.firstName,
                    lastName: this.lastName,
                    email: this.email,
                    password: this.password,
                    confirmPassword: this.confirmPassword
                }
            });
            redirect(result.redirectUrl);
        } catch (error) {
            this.errorMessage = reduceErrors(error);
            logger.error('Registration failed', error);
            this.isLoading = false;
        }
    }

    isValid() {
        const confirm = this.template.querySelector('[data-id="confirmPassword"]');
        if (confirm) {
            confirm.setCustomValidity(
                this.password === this.confirmPassword ? '' : PASSWORD_MISMATCH
            );
        }
        return [...this.template.querySelectorAll('lightning-input, c-password-input')].reduce(
            (valid, input) => input.reportValidity() && valid,
            true
        );
    }
}
