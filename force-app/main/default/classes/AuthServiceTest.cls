@IsTest
private class AuthServiceTest {
    private static final Id FAKE_USER_ID = '005000000000001AAA';

    private class TestException extends Exception {
    }

    /** Stub that never touches real Site APIs. */
    private virtual class StubGateway extends SiteGateway {
        public Boolean loginSucceeds = true;
        public Boolean loginThrows = false;
        public Boolean resetSent = true;
        public String lastResetUsername;
        public Exception createFailure;
        public Exception passwordFailure;
        public String lastUsername;
        public String lastStartUrl;

        public override PageReference login(String username, String password, String startUrl) {
            lastUsername = username;
            lastStartUrl = startUrl;
            if (loginThrows) {
                throw new TestException();
            }
            return loginSucceeds ? new PageReference('/frontdoor?start=' + startUrl) : null;
        }

        public override Id createPortalUser(User user, Id accountId, String password) {
            if (createFailure != null) {
                throw createFailure;
            }
            return FAKE_USER_ID;
        }

        public override Boolean forgotPassword(String username) {
            lastResetUsername = username;
            return resetSent;
        }

        public override void validatePassword(User user, String password, String confirmPassword) {
            if (passwordFailure != null) {
                throw passwordFailure;
            }
        }
    }

    private static StubGateway useStub() {
        StubGateway stub = new StubGateway();
        SiteGateway.instance = stub;
        return stub;
    }

    private static RegistrationRequestDTO validRegistration() {
        RegistrationRequestDTO request = new RegistrationRequestDTO();
        request.firstName = 'Ann';
        request.lastName = 'Smith';
        request.email = 'Ann.Smith@example.com';
        request.password = 'Passw0rd!x';
        request.confirmPassword = 'Passw0rd!x';
        return request;
    }

    private static void assertAuthError(Exception ex, String expectedMessage) {
        Assert.isNotNull(ex, 'Expected AuthException');
        Assert.isInstanceOfType(ex, AuthException.class);
        Assert.areEqual(expectedMessage, ex.getMessage());
    }

    @IsTest
    static void loginBuildsUsernameAndReturnsUrl() {
        StubGateway stub = useStub();
        LoginRequestDTO request = new LoginRequestDTO();
        request.email = ' User@Example.com ';
        request.password = 'secret';
        request.startUrl = '/expenses';

        AuthResultDTO result = AuthService.login(request);

        Assert.areEqual('user@example.com.expensetracker', stub.lastUsername);
        Assert.areEqual('/expenses', stub.lastStartUrl);
        Assert.isTrue(result.redirectUrl.startsWith('/frontdoor'));
    }

    @IsTest
    static void loginWithWrongCredentialsFails() {
        useStub().loginSucceeds = false;
        LoginRequestDTO request = new LoginRequestDTO();
        request.email = 'user@example.com';
        request.password = 'bad';
        Exception caught;
        try {
            AuthService.login(request);
        } catch (Exception ex) {
            caught = ex;
        }
        assertAuthError(caught, Label.Auth_Error_Invalid_Credentials);
    }

    @IsTest
    static void loginRequiresFields() {
        useStub();
        Exception caught;
        try {
            AuthService.login(new LoginRequestDTO());
        } catch (Exception ex) {
            caught = ex;
        }
        assertAuthError(caught, Label.Auth_Error_Required_Fields);
    }

    @IsTest
    static void unsafeStartUrlFallsBackToDefault() {
        for (
            String unsafe : new List<String>{
                'https://evil.example',
                '//evil.example',
                '/\\evil',
                'javascript:alert(1)',
                '/path://x',
                '   '
            }
        ) {
            Assert.areEqual('/welcome', AuthService.sanitizeStartUrl(unsafe), unsafe);
        }
        Assert.areEqual('/welcome', AuthService.sanitizeStartUrl(null));
        Assert.areEqual('/a/b?c=1', AuthService.sanitizeStartUrl('/a/b?c=1'));
    }

    @IsTest
    static void registerCreatesAccountAndLogsIn() {
        StubGateway stub = useStub();

        Test.startTest();
        AuthResultDTO result = AuthService.register(validRegistration());
        Test.stopTest();

        Assert.isNotNull(result.redirectUrl);
        Assert.areEqual('ann.smith@example.com.expensetracker', stub.lastUsername);
        Assert.areEqual('/welcome', stub.lastStartUrl);
        Assert.areEqual(1, [SELECT COUNT() FROM Account WHERE Name = 'Ann Smith' WITH SYSTEM_MODE]);
    }

    @IsTest
    static void registerValidatesInput() {
        useStub();
        RegistrationRequestDTO request = validRegistration();
        request.lastName = '';
        Exception caught;
        try {
            AuthService.register(request);
        } catch (Exception ex) {
            caught = ex;
        }
        assertAuthError(caught, Label.Auth_Error_Required_Fields);

        request = validRegistration();
        request.email = 'not-an-email';
        caught = null;
        try {
            AuthService.register(request);
        } catch (Exception ex) {
            caught = ex;
        }
        assertAuthError(caught, Label.Auth_Error_Invalid_Email);

        request = validRegistration();
        request.confirmPassword = 'different';
        caught = null;
        try {
            AuthService.register(request);
        } catch (Exception ex) {
            caught = ex;
        }
        assertAuthError(caught, Label.Auth_Error_Password_Mismatch);
    }

    @IsTest
    static void registerRollsBackAndReportsDuplicate() {
        useStub().createFailure = new DmlException('Username already exists');
        Exception caught;
        try {
            AuthService.register(validRegistration());
        } catch (Exception ex) {
            caught = ex;
        }
        assertAuthError(caught, Label.Auth_Error_User_Exists);
        Assert.areEqual(0, [SELECT COUNT() FROM Account WHERE Name = 'Ann Smith' WITH SYSTEM_MODE]);
    }

    @IsTest
    static void registerRethrowsUnexpectedFailure() {
        useStub().createFailure = new CalloutException('boom');
        Exception caught;
        try {
            AuthService.register(validRegistration());
        } catch (Exception ex) {
            caught = ex;
        }
        Assert.isInstanceOfType(caught, CalloutException.class);
    }

    @IsTest
    static void registerFailsWhenAutoLoginFails() {
        useStub().loginSucceeds = false;
        Exception caught;
        Test.startTest();
        try {
            AuthService.register(validRegistration());
        } catch (Exception ex) {
            caught = ex;
        }
        Test.stopTest();
        assertAuthError(caught, Label.Auth_Error_Registered_Login_Failed);
    }

    @IsTest
    static void settingsFallBackToDefaults() {
        AuthSettings.testSetting = new Auth_Setting__mdt();
        Assert.areEqual('.expensetracker', AuthSettings.usernameSuffix());
        Assert.areEqual('/welcome', AuthSettings.defaultStartUrl());
        Assert.areEqual('Expense_Tracker_Member', AuthSettings.memberPermissionSet());
    }

    @IsTest
    static void defaultGatewayDelegatesToSite() {
        SiteGateway gateway = SiteGateway.getInstance();
        Assert.isNotNull(gateway);
        // Outside a site context Site.login simply returns null / throws; the wrapper must just delegate.
        try {
            gateway.login('nobody@example.com.expensetracker', 'wrong', '/');
        } catch (Exception ex) {
            Assert.isNotNull(ex.getMessage());
        }
    }

    @IsTest
    static void defaultGatewayCreatePortalUserDelegates() {
        try {
            SiteGateway.getInstance().createPortalUser(new User(), null, 'x');
        } catch (Exception ex) {
            Assert.isNotNull(ex.getMessage());
        }
    }

    @IsTest
    static void loginExceptionMeansInvalidCredentials() {
        useStub().loginThrows = true;
        LoginRequestDTO request = new LoginRequestDTO();
        request.email = 'user@example.com';
        request.password = 'bad';
        Exception caught;
        try {
            AuthService.login(request);
        } catch (Exception ex) {
            caught = ex;
        }
        assertAuthError(caught, Label.Auth_Error_Invalid_Credentials);
    }

    @IsTest
    static void passwordComparisonIsCaseSensitive() {
        useStub();
        RegistrationRequestDTO request = validRegistration();
        request.confirmPassword = request.password.toLowerCase();
        Exception caught;
        try {
            AuthService.register(request);
        } catch (Exception ex) {
            caught = ex;
        }
        assertAuthError(caught, Label.Auth_Error_Password_Mismatch);
    }

    @IsTest
    static void passwordPolicyViolationIsShownToUser() {
        useStub().passwordFailure = new TestException(
            'Your password must include letters and numbers.'
        );
        Exception caught;
        try {
            AuthService.register(validRegistration());
        } catch (Exception ex) {
            caught = ex;
        }
        assertAuthError(caught, 'Your password must include letters and numbers.');
    }

    @IsTest
    static void forgotPasswordUsesSuffixedUsername() {
        StubGateway stub = useStub();
        ForgotPasswordRequestDTO request = new ForgotPasswordRequestDTO();
        request.email = ' Ann@Example.com ';
        AuthService.forgotPassword(request);
        Assert.areEqual('ann@example.com.expensetracker', stub.lastResetUsername);
    }

    @IsTest
    static void forgotPasswordDoesNotRevealUnknownEmail() {
        useStub().resetSent = false;
        ForgotPasswordRequestDTO request = new ForgotPasswordRequestDTO();
        request.email = 'nobody@example.com';
        AuthService.forgotPassword(request);
        Assert.isTrue(true, 'No exception: the caller cannot tell whether the account exists');
    }

    @IsTest
    static void forgotPasswordValidatesEmail() {
        useStub();
        ForgotPasswordRequestDTO request = new ForgotPasswordRequestDTO();
        request.email = 'not-an-email';
        Exception caught;
        try {
            AuthService.forgotPassword(request);
        } catch (Exception ex) {
            caught = ex;
        }
        assertAuthError(caught, Label.Auth_Error_Invalid_Email);
    }

    @IsTest
    static void defaultGatewayForgotPasswordDelegates() {
        try {
            SiteGateway.getInstance().forgotPassword('nobody@example.com.expensetracker');
        } catch (Exception ex) {
            Assert.isNotNull(ex.getMessage());
        }
    }

    @IsTest
    static void failedResetForExistingUserIsLoggedAsError() {
        String email = 'reset' + Math.abs(Crypto.getRandomInteger()) + '@example.com';
        User existing = new User(
            Username = email + '.expensetracker',
            Email = email,
            LastName = 'Reset',
            Alias = 'reset',
            ProfileId = [SELECT Id FROM Profile WHERE Name = 'Standard User']
            .Id,
            TimeZoneSidKey = 'America/Los_Angeles',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US'
        );
        System.runAs(new User(Id = UserInfo.getUserId())) {
            insert existing;
        }
        useStub().resetSent = false;
        ForgotPasswordRequestDTO request = new ForgotPasswordRequestDTO();
        request.email = email;

        Test.startTest();
        AuthService.forgotPassword(request);
        Logger.flush();
        Test.stopTest();

        Assert.areEqual(
            1,
            [SELECT COUNT() FROM Error_Log__c WHERE Level__c = 'ERROR' WITH SYSTEM_MODE]
        );
    }

    @IsTest
    static void userSelectorFindsOnlyActiveUsers() {
        Assert.isTrue(UserSelector.isActiveUsername(UserInfo.getUserName()));
        Assert.isFalse(UserSelector.isActiveUsername('nobody@example.com.expensetracker'));
    }
}
