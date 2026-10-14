/**
 * Persists Log_Event__e platform events as Error_Log__c records.
 */
public with sharing class LogEventTriggerHandler {
    public static void handle(List<Log_Event__e> events) {
        List<Error_Log__c> logs = new List<Error_Log__c>();
        for (Log_Event__e event : events) {
            logs.add(
                new Error_Log__c(
                    Level__c = event.Level__c,
                    Source__c = event.Source__c,
                    Message__c = event.Message__c,
                    Stack_Trace__c = event.Stack_Trace__c,
                    Exception_Type__c = event.Exception_Type__c,
                    Running_User__c = toUserId(event.Running_User_Id__c),
                    Request_Id__c = event.Request_Id__c,
                    Quiddity__c = event.Quiddity__c,
                    Context__c = event.Context__c
                )
            );
        }
        // System mode: the trigger runs as Automated Process, which has no explicit object/field access.
        Database.insert(logs, false, AccessLevel.SYSTEM_MODE);
    }

    private static Id toUserId(String value) {
        try {
            return String.isBlank(value) ? null : Id.valueOf(value);
        } catch (Exception ex) {
            return null;
        }
    }
}
