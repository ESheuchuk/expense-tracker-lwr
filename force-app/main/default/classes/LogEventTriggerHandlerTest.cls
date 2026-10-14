@IsTest
private class LogEventTriggerHandlerTest {
    @IsTest
    static void eventIsConvertedToErrorLog() {
        Test.startTest();
        EventBus.publish(
            new Log_Event__e(
                Level__c = 'ERROR',
                Source__c = 'Handler',
                Message__c = 'm',
                Running_User_Id__c = 'not-an-id'
            )
        );
        Test.stopTest();

        List<Error_Log__c> logs = [
            SELECT Source__c, Running_User__c
            FROM Error_Log__c
            WITH SYSTEM_MODE
        ];
        Assert.areEqual(1, logs.size());
        Assert.areEqual('Handler', logs[0].Source__c);
        Assert.isNull(logs[0].Running_User__c, 'Invalid user id must be ignored');
    }
}
