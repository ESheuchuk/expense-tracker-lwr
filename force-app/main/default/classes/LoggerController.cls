/**
 * Exposes client-side logger configuration (Logger_Setting__mdt) to the c/logger LWC module.
 */
public with sharing class LoggerController {
    @AuraEnabled(cacheable=true)
    public static LoggerSettingsDTO getClientSettings() {
        LoggerSettingsDTO dto = new LoggerSettingsDTO();
        dto.consoleEnabled = LoggerSettings.isConsoleEnabled();
        dto.level = LoggerSettings.consoleLevel().name();
        return dto;
    }
}
