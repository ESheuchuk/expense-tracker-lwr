@IsTest
private class AuthControllerTest {
    private virtual class FailingGateway extends SiteGateway {
        public override PageReference login(String username, String password, String startUrl) {
            throw new CalloutException('internal failure details');
        }

        public override void validatePassword(User user, String password, String confirmPassword) {
            // password policy is not under test here
        }

        public override Id createPortalUser(User user, Id accountId, String password) {
            throw new CalloutException('internal failure details');
        }

        public override Boolean forgotPassword(String username) {
            throw new CalloutException('internal failure details');
        }
    }

    private virtual class OkGateway extends SiteGateway {
        public override PageReference login(String username, String password, String startUrl) {
            return new PageReference('/frontdoor');
        }
    }

    @IsTest
    static void loginReturnsRedirectUrl() {
        SiteGateway.instance = new OkGateway();
        LoginRequestDTO request = new LoginRequestDTO();
        request.email = 'user@example.com';
        request.password = 'secret';
        Assert.areEqual('/frontdoor', AuthController.login(request).redirectUrl);
    }

    @IsTest
    static void expectedErrorsAreShownToUser() {
        AuraHandledException caught;
        try {
            AuthController.login(new LoginRequestDTO());
        } catch (AuraHandledException ex) {
            caught = ex;
        }
        Assert.isNotNull(caught);
        Assert.areEqual(Label.Auth_Error_Required_Fields, caught.getMessage());

        caught = null;
        try {
            AuthController.register(new RegistrationRequestDTO());
        } catch (AuraHandledException ex) {
            caught = ex;
        }
        Assert.isNotNull(caught);
        Assert.areEqual(Label.Auth_Error_Required_Fields, caught.getMessage());
    }

    @IsTest
    static void wrongCredentialsAreNotLoggedAsErrors() {
        // Site.login throws on bad credentials; that is a user error, not a system failure.
        SiteGateway.instance = new FailingGateway();
        LoginRequestDTO request = new LoginRequestDTO();
        request.email = 'user@example.com';
        request.password = 'secret';

        Test.startTest();
        AuraHandledException caught;
        try {
            AuthController.login(request);
        } catch (AuraHandledException ex) {
            caught = ex;
        }
        Test.stopTest();

        Assert.isNotNull(caught);
        Assert.areEqual(Label.Auth_Error_Invalid_Credentials, caught.getMessage());
        Assert.areEqual(0, [SELECT COUNT() FROM Error_Log__c WITH SYSTEM_MODE]);
    }

    @IsTest
    static void unexpectedErrorsAreLoggedAndMasked() {
        SiteGateway.instance = new FailingGateway();
        ForgotPasswordRequestDTO request = new ForgotPasswordRequestDTO();
        request.email = 'user@example.com';

        Test.startTest();
        AuraHandledException caught;
        try {
            AuthController.forgotPassword(request);
        } catch (AuraHandledException ex) {
            caught = ex;
        }
        Test.stopTest();

        Assert.isNotNull(caught);
        Assert.areEqual(Label.Auth_Error_Generic, caught.getMessage());
        List<Error_Log__c> logs = [
            SELECT Source__c, Message__c
            FROM Error_Log__c
            WITH SYSTEM_MODE
        ];
        Assert.areEqual(1, logs.size());
        Assert.areEqual('AuthController.forgotPassword', logs[0].Source__c);
        Assert.isTrue(logs[0].Message__c.contains('internal failure details'));
    }

    @IsTest
    static void forgotPasswordValidationIsShownToUser() {
        AuraHandledException caught;
        try {
            AuthController.forgotPassword(new ForgotPasswordRequestDTO());
        } catch (AuraHandledException ex) {
            caught = ex;
        }
        Assert.isNotNull(caught);
        Assert.areEqual(Label.Auth_Error_Required_Fields, caught.getMessage());
    }

    @IsTest
    static void registerFailureIsLoggedAndMasked() {
        SiteGateway.instance = new FailingGateway();
        RegistrationRequestDTO request = new RegistrationRequestDTO();
        request.lastName = 'Smith';
        request.email = 'smith@example.com';
        request.password = 'Passw0rd!x';
        request.confirmPassword = 'Passw0rd!x';

        Test.startTest();
        AuraHandledException caught;
        try {
            AuthController.register(request);
        } catch (AuraHandledException ex) {
            caught = ex;
        }
        Test.stopTest();

        Assert.isNotNull(caught);
        Assert.areEqual(Label.Auth_Error_Generic, caught.getMessage());
        List<Error_Log__c> logs = [SELECT Source__c FROM Error_Log__c WITH SYSTEM_MODE];
        Assert.areEqual(1, logs.size());
        Assert.areEqual('AuthController.register', logs[0].Source__c);
    }
}
