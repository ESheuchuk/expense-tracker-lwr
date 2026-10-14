import { LightningElement } from 'lwc';
import FOOTER_TEXT from '@salesforce/label/c.Footer_Text';

export default class SiteFooter extends LightningElement {
    labels = { text: FOOTER_TEXT };

    get year() {
        return new Date().getFullYear();
    }
}
