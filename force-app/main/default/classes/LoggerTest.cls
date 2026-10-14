@IsTest
private class LoggerTest {
    @IsTest
    static void errorIsPublishedAndPersisted() {
        Test.startTest();
        try {
            Integer boom = 1 / 0;
        } catch (Exception ex) {
            Logger.error('LoggerTest', ex, new Map<String, Object>{ 'key' => 'value' });
        }
        Assert.areEqual(1, Logger.bufferSize());
        Logger.flush();
        Test.stopTest();

        Assert.areEqual(0, Logger.bufferSize());
        List<Error_Log__c> logs = [
            SELECT
                Level__c,
                Source__c,
                Exception_Type__c,
                Context__c,
                Running_User__c,
                Stack_Trace__c
            FROM Error_Log__c
            WITH SYSTEM_MODE
        ];
        Assert.areEqual(1, logs.size());
        Assert.areEqual('ERROR', logs[0].Level__c);
        Assert.areEqual('LoggerTest', logs[0].Source__c);
        Assert.areEqual('System.MathException', logs[0].Exception_Type__c);
        Assert.isTrue(logs[0].Context__c.contains('value'));
        Assert.areEqual(UserInfo.getUserId(), logs[0].Running_User__c);
    }

    @IsTest
    static void entriesBelowPersistLevelAreSkipped() {
        LoggerSettings.testSetting = new Logger_Setting__mdt(
            Apex_Persist_Level__c = 'ERROR',
            Apex_Debug_Level__c = 'DEBUG'
        );
        Logger.debug('LoggerTest', 'debug');
        Logger.info('LoggerTest', 'info');
        Logger.warn('LoggerTest', 'warn');
        Assert.areEqual(0, Logger.bufferSize());
        Logger.error('LoggerTest', 'error');
        Assert.areEqual(1, Logger.bufferSize());
    }

    @IsTest
    static void lowerPersistLevelStoresAllLevels() {
        LoggerSettings.testSetting = new Logger_Setting__mdt(Apex_Persist_Level__c = 'DEBUG');
        Test.startTest();
        Logger.debug('LoggerTest', 'debug');
        Logger.info('LoggerTest', 'info');
        Logger.warn('LoggerTest', 'warn');
        Logger.flush();
        Test.stopTest();
        Assert.areEqual(3, [SELECT COUNT() FROM Error_Log__c WITH SYSTEM_MODE]);
    }

    @IsTest
    static void flushWithEmptyBufferDoesNothing() {
        Logger.flush();
        Assert.areEqual(0, Logger.bufferSize());
    }

    @IsTest
    static void settingsFallBackToDefaults() {
        LoggerSettings.testSetting = new Logger_Setting__mdt(
            Console_Log_Level__c = 'garbage',
            Console_Enabled__c = false
        );
        Assert.areEqual(LogLevel.ERROR, LoggerSettings.consoleLevel());
        Assert.isFalse(LoggerSettings.isConsoleEnabled());
        LoggerSettings.testSetting = new Logger_Setting__mdt(Console_Log_Level__c = 'warn');
        Assert.areEqual(LogLevel.WARN, LoggerSettings.consoleLevel());
    }
}
