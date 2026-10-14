/**
 * Logger configuration exposed to LWC.
 */
public with sharing class LoggerSettingsDTO {
    @AuraEnabled
    public Boolean consoleEnabled;
    @AuraEnabled
    public String level;
}
