import { LightningElement } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import IS_GUEST from '@salesforce/user/isGuest';
import { createLogger } from 'c/logger';
import { PAGES, namedPage, logout } from 'c/siteRoutes';
import FEATURES_HEADING from '@salesforce/label/c.Landing_Features_Heading';
import F1_TITLE from '@salesforce/label/c.Landing_Feature_1_Title';
import F1_TEXT from '@salesforce/label/c.Landing_Feature_1_Text';
import F2_TITLE from '@salesforce/label/c.Landing_Feature_2_Title';
import F2_TEXT from '@salesforce/label/c.Landing_Feature_2_Text';
import F3_TITLE from '@salesforce/label/c.Landing_Feature_3_Title';
import F3_TEXT from '@salesforce/label/c.Landing_Feature_3_Text';

const logger = createLogger('landingPage');

/** Container for the public landing page: owns navigation, children are presentational. */
export default class LandingPage extends NavigationMixin(LightningElement) {
    isGuest = IS_GUEST;

    labels = { featuresHeading: FEATURES_HEADING };

    features = [
        { id: 'track', icon: 'utility:moneybag', title: F1_TITLE, text: F1_TEXT },
        { id: 'organize', icon: 'utility:category', title: F2_TITLE, text: F2_TEXT },
        { id: 'insights', icon: 'utility:chart', title: F3_TITLE, text: F3_TEXT }
    ];

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
