import { LightningElement } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import forgotPassword from '@salesforce/apex/AuthController.forgotPassword';
import { createLogger } from 'c/logger';
import { reduceErrors } from 'c/errorUtils';
import { PAGES, namedPage, isPlainLeftClick } from 'c/siteRoutes';
import TITLE from '@salesforce/label/c.Forgot_Title';
import INSTRUCTIONS from '@salesforce/label/c.Forgot_Instructions';
import SUBMIT from '@salesforce/label/c.Forgot_Submit';
import SUCCESS from '@salesforce/label/c.Forgot_Success';
import BACK_TO_LOGIN from '@salesforce/label/c.Forgot_Back_To_Login';
import EMAIL from '@salesforce/label/c.Login_Email';
import LOADING from '@salesforce/label/c.Common_Loading';
import REQUIRED from '@salesforce/label/c.Common_Validation_Required';

const logger = createLogger('authForgotPasswordForm');

/**
 * Password reset container. Users type their email; the suffixed username is built in Apex.
 * The success message is the same whether or not the account exists.
 */
export default class AuthForgotPasswordForm extends NavigationMixin(LightningElement) {
    email = '';
    errorMessage = '';
    isLoading = false;
    isSent = false;
    loginUrl;

    labels = {
        title: TITLE,
        instructions: INSTRUCTIONS,
        submit: SUBMIT,
        success: SUCCESS,
        backToLogin: BACK_TO_LOGIN,
        email: EMAIL,
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
        const input = this.template.querySelector('lightning-input');
        if (!input.reportValidity() || this.isLoading) {
            return;
        }
        this.isLoading = true;
        try {
            await forgotPassword({ request: { email: this.email } });
            this.isSent = true;
        } catch (error) {
            this.errorMessage = reduceErrors(error);
            logger.error('Password reset failed', error);
        } finally {
            this.isLoading = false;
        }
    }
}
