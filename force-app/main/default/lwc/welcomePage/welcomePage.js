import { LightningElement } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import IS_GUEST from '@salesforce/user/isGuest';
import { createLogger } from 'c/logger';
import { PAGES, namedPage, logout } from 'c/siteRoutes';
import TITLE from '@salesforce/label/c.Welcome_Title';
import TEXT from '@salesforce/label/c.Welcome_Text';
import HOME from '@salesforce/label/c.Nav_Home';

const logger = createLogger('welcomePage');

/** Stub page shown right after login / registration. */
export default class WelcomePage extends NavigationMixin(LightningElement) {
    isGuest = IS_GUEST;

    labels = { title: TITLE, text: TEXT, home: HOME };

    handleHome() {
        this.go(PAGES.HOME);
    }

    handleLogin() {
        this.go(PAGES.LOGIN);
    }

    handleRegister() {
        this.go(PAGES.REGISTER);
    }

    handleOpenApp() {
        this.go(PAGES.WELCOME);
    }

    handleLogout() {
        logout();
    }

    go(pageName) {
        try {
            this[NavigationMixin.Navigate](namedPage(pageName));
        } catch (error) {
            logger.error(`Navigation to ${pageName} failed`, error);
        }
    }
}
