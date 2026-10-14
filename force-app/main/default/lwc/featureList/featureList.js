import { LightningElement, api } from 'lwc';

export default class FeatureList extends LightningElement {
    @api heading;
    /** Array of { id, icon, title, text } */
    @api features = [];
}
