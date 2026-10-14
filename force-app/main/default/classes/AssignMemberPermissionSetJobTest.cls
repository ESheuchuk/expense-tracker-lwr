@IsTest
private class AssignMemberPermissionSetJobTest {
    private static User createUser() {
        Profile profile = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];
        String unique = String.valueOf(Crypto.getRandomInteger()).left(8);
        return new User(
            Username = 'psjob' + unique + '@example.com.test',
            Email = 'psjob@example.com',
            LastName = 'Job',
            Alias = 'psjob',
            ProfileId = profile.Id,
            TimeZoneSidKey = 'America/Los_Angeles',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US'
        );
    }

    @IsTest
    static void assignsPermissionSet() {
        User user = createUser();
        System.runAs(new User(Id = UserInfo.getUserId())) {
            insert user;
        }
        Test.startTest();
        System.enqueueJob(new AssignMemberPermissionSetJob(user.Id, 'Expense_Tracker_Member'));
        Test.stopTest();

        Assert.areEqual(
            1,
            [
                SELECT COUNT()
                FROM PermissionSetAssignment
                WHERE AssigneeId = :user.Id AND PermissionSet.Name = 'Expense_Tracker_Member'
                WITH SYSTEM_MODE
            ]
        );
    }

    @IsTest
    static void missingPermissionSetIsLogged() {
        Test.startTest();
        System.enqueueJob(
            new AssignMemberPermissionSetJob(UserInfo.getUserId(), 'No_Such_Permission_Set')
        );
        Test.stopTest();
        Assert.areEqual(1, [SELECT COUNT() FROM Error_Log__c WITH SYSTEM_MODE]);
    }

    @IsTest
    static void duplicateAssignmentIsLogged() {
        User user = createUser();
        System.runAs(new User(Id = UserInfo.getUserId())) {
            insert user;
            insert new PermissionSetAssignment(
                AssigneeId = user.Id,
                PermissionSetId = [
                    SELECT Id
                    FROM PermissionSet
                    WHERE Name = 'Expense_Tracker_Member'
                ]
                .Id
            );
        }
        Test.startTest();
        new AssignMemberPermissionSetJob(user.Id, 'Expense_Tracker_Member').execute(null);
        Test.stopTest();
        Assert.areEqual(
            1,
            [SELECT COUNT() FROM Error_Log__c WHERE Level__c = 'ERROR' WITH SYSTEM_MODE]
        );
    }
}
