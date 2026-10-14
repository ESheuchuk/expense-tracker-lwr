import { LightningElement } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import login from '@salesforce/apex/AuthController.login';
import { createLogger } from 'c/logger';
import { reduceErrors } from 'c/errorUtils';
import { PAGES, namedPage, redirect, isPlainLeftClick } from 'c/siteRoutes';
import TITLE from '@salesforce/label/c.Login_Title';
import EMAIL from '@salesforce/label/c.Login_Email';
import PASSWORD from '@salesforce/label/c.Login_Password';
import SUBMIT from '@salesforce/label/c.Login_Submit';
import FORGOT from '@salesforce/label/c.Login_Forgot';
import NO_ACCOUNT from '@salesforce/label/c.Login_No_Account';
import REGISTER_LINK from '@salesforce/label/c.Nav_Register';
import LOADING from '@salesforce/label/c.Common_Loading';
import REQUIRED from '@salesforce/label/c.Common_Validation_Required';

const logger = createLogger('authLoginForm');

/** Login container: owns the Apex call and form state. */
export default class AuthLoginForm extends NavigationMixin(LightningElement) {
    email = '';
    password = '';
    errorMessage = '';
    isLoading = false;
    forgotUrl;
    registerUrl;

    labels = {
        title: TITLE,
        email: EMAIL,
        password: PASSWORD,
        submit: SUBMIT,
        forgot: FORGOT,
        noAccount: NO_ACCOUNT,
        registerLink: REGISTER_LINK,
        loading: LOADING,
        required: REQUIRED
    };

    connectedCallback() {
        // Real hrefs keep the links accessible (open in new tab, screen readers, SEO)
        this[NavigationMixin.GenerateUrl](namedPage(PAGES.FORGOT_PASSWORD)).then((url) => {
            this.forgotUrl = url;
        });
        this[NavigationMixin.GenerateUrl](namedPage(PAGES.REGISTER)).then((url) => {
            this.registerUrl = url;
        });
    }

    handleChange(event) {
        this[event.target.name] = event.target.value;
    }

    handleForgot(event) {
        this.navigateFromLink(event, PAGES.FORGOT_PASSWORD);
    }

    handleRegister(event) {
        this.navigateFromLink(event, PAGES.REGISTER);
    }

    navigateFromLink(event, pageName) {
        if (!isPlainLeftClick(event)) {
            return;
        }
        event.preventDefault();
        this[NavigationMixin.Navigate](namedPage(pageName));
    }

    async handleSubmit(event) {
        event.preventDefault();
        this.errorMessage = '';
        if (!this.isValid() || this.isLoading) {
            return;
        }
        this.isLoading = true;
        try {
            const result = await login({
                request: {
                    email: this.email,
                    password: this.password,
                    startUrl: this.startUrl()
                }
            });
            redirect(result.redirectUrl);
        } catch (error) {
            this.errorMessage = reduceErrors(error);
            logger.error('Login failed', error);
            this.isLoading = false;
        }
    }

    isValid() {
        return [...this.template.querySelectorAll('lightning-input, c-password-input')].reduce(
            (valid, input) => input.reportValidity() && valid,
            true
        );
    }

    startUrl() {
        return new URLSearchParams(window.location.search).get('startURL') || '';
    }
}
