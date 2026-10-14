import { LightningElement, api } from 'lwc';
import TITLE from '@salesforce/label/c.Landing_Hero_Title';
import SUBTITLE from '@salesforce/label/c.Landing_Hero_Subtitle';
import CTA from '@salesforce/label/c.Landing_Hero_Cta';

export default class HeroSection extends LightningElement {
    @api isGuest = false;

    labels = { title: TITLE, subtitle: SUBTITLE, cta: CTA };

    handleCta() {
        this.dispatchEvent(new CustomEvent('cta'));
    }
}
