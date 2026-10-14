@IsTest
private class LoggerControllerTest {
    @IsTest
    static void returnsClientSettings() {
        LoggerSettings.testSetting = new Logger_Setting__mdt(
            Console_Enabled__c = true,
            Console_Log_Level__c = 'INFO'
        );
        LoggerSettingsDTO dto = LoggerController.getClientSettings();
        Assert.isTrue(dto.consoleEnabled);
        Assert.areEqual('INFO', dto.level);
    }
}
