/**
 * Reads Auth_Setting__mdt.Default with safe fallbacks.
 */
public with sharing class AuthSettings {
    @TestVisible
    private static Auth_Setting__mdt testSetting;

    public static String usernameSuffix() {
        return value(current()?.Username_Suffix__c, '.expensetracker');
    }

    public static String defaultStartUrl() {
        return value(current()?.Default_Start_Url__c, '/welcome');
    }

    public static String memberPermissionSet() {
        return value(current()?.Member_Permission_Set__c, 'Expense_Tracker_Member');
    }

    private static Auth_Setting__mdt current() {
        return testSetting != null ? testSetting : Auth_Setting__mdt.getInstance('Default');
    }

    private static String value(String candidate, String fallback) {
        return String.isBlank(candidate) ? fallback : candidate;
    }
}
