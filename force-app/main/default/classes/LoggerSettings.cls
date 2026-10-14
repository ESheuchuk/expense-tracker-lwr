/**
 * Reads Logger_Setting__mdt.Default and exposes parsed thresholds with safe defaults.
 */
public with sharing class LoggerSettings {
    @TestVisible
    private static Logger_Setting__mdt testSetting;

    public static Boolean isConsoleEnabled() {
        Logger_Setting__mdt setting = current();
        return setting == null || setting.Console_Enabled__c != false;
    }

    public static LogLevel consoleLevel() {
        Logger_Setting__mdt setting = current();
        return parse(setting?.Console_Log_Level__c);
    }

    public static LogLevel debugLevel() {
        Logger_Setting__mdt setting = current();
        return parse(setting?.Apex_Debug_Level__c);
    }

    public static LogLevel persistLevel() {
        Logger_Setting__mdt setting = current();
        return parse(setting?.Apex_Persist_Level__c);
    }

    @TestVisible
    private static Logger_Setting__mdt current() {
        return testSetting != null ? testSetting : Logger_Setting__mdt.getInstance('Default');
    }

    private static LogLevel parse(String value) {
        if (String.isNotBlank(value)) {
            for (LogLevel level : LogLevel.values()) {
                if (level.name() == value.toUpperCase()) {
                    return level;
                }
            }
        }
        return LogLevel.ERROR;
    }
}
