import { LightningElement, api } from 'lwc';
import SITE_NAME from '@salesforce/label/c.Site_Name';
import NAV_LOGIN from '@salesforce/label/c.Nav_Login';
import NAV_REGISTER from '@salesforce/label/c.Nav_Register';
import NAV_LOGOUT from '@salesforce/label/c.Nav_Logout';
import NAV_OPEN_APP from '@salesforce/label/c.Nav_Open_App';

/** Presentational header: emits home / login / register / openapp / logout events. */
export default class SiteHeader extends LightningElement {
    @api isGuest = false;

    labels = {
        siteName: SITE_NAME,
        login: NAV_LOGIN,
        register: NAV_REGISTER,
        logout: NAV_LOGOUT,
        openApp: NAV_OPEN_APP
    };

    handleHome() {
        this.dispatchEvent(new CustomEvent('home'));
    }

    handleLogin() {
        this.dispatchEvent(new CustomEvent('login'));
    }

    handleRegister() {
        this.dispatchEvent(new CustomEvent('register'));
    }

    handleOpenApp() {
        this.dispatchEvent(new CustomEvent('openapp'));
    }

    handleLogout() {
        this.dispatchEvent(new CustomEvent('logout'));
    }
}
