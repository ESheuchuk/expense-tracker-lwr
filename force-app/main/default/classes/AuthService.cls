/**
 * Business logic for login, self-registration and password reset of community users.
 */
public with sharing class AuthService {
    private static final Pattern EMAIL_PATTERN = Pattern.compile(
        '^[A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,}$'
    );

    public static AuthResultDTO login(LoginRequestDTO request) {
        if (request == null || String.isBlank(request.email) || String.isBlank(request.password)) {
            throw new AuthException(Label.Auth_Error_Required_Fields);
        }
        PageReference target = siteLogin(
            toUsername(request.email),
            request.password,
            sanitizeStartUrl(request.startUrl)
        );
        if (target == null) {
            throw new AuthException(Label.Auth_Error_Invalid_Credentials);
        }
        return new AuthResultDTO(target.getUrl());
    }

    /**
     * Always succeeds from the caller's point of view, so the response does not reveal
     * whether an account with this email exists.
     */
    public static void forgotPassword(ForgotPasswordRequestDTO request) {
        if (request == null || String.isBlank(request.email)) {
            throw new AuthException(Label.Auth_Error_Required_Fields);
        }
        if (!EMAIL_PATTERN.matcher(request.email.trim()).matches()) {
            throw new AuthException(Label.Auth_Error_Invalid_Email);
        }
        String username = toUsername(request.email);
        Boolean sent = SiteGateway.getInstance().forgotPassword(username);
        if (sent == true) {
            Logger.info('AuthService.forgotPassword', 'Reset email sent to ' + username);
        } else if (UserSelector.isActiveUsername(username)) {
            // The account exists, so a failed reset is a system problem worth persisting.
            Logger.error(
                'AuthService.forgotPassword',
                'Site.forgotPassword returned false for active user ' + username
            );
        } else {
            Logger.info('AuthService.forgotPassword', 'No active user ' + username);
        }
    }

    public static AuthResultDTO register(RegistrationRequestDTO request) {
        validateRegistration(request);

        String email = request.email.trim();
        User user = buildUser(request, email);
        validatePassword(user, request);

        Id userId = createAccountAndUser(user, request);

        System.enqueueJob(
            new AssignMemberPermissionSetJob(userId, AuthSettings.memberPermissionSet())
        );

        PageReference target = siteLogin(
            user.Username,
            request.password,
            AuthSettings.defaultStartUrl()
        );
        if (target == null) {
            throw new AuthException(Label.Auth_Error_Registered_Login_Failed);
        }
        return new AuthResultDTO(target.getUrl());
    }

    /**
     * Only site-relative paths are allowed, anything else falls back to the default start URL
     * (protects against open redirect).
     */
    @TestVisible
    private static String sanitizeStartUrl(String startUrl) {
        String fallback = AuthSettings.defaultStartUrl();
        if (String.isBlank(startUrl)) {
            return fallback;
        }
        String candidate = startUrl.trim();
        Boolean isRelative =
            candidate.startsWith('/') &&
            !candidate.startsWith('//') &&
            !candidate.contains('\\') &&
            !candidate.contains('://') &&
            !Pattern.compile('[\\x00-\\x1F]').matcher(candidate).find();
        return isRelative ? candidate : fallback;
    }

    /**
     * Site.login throws (instead of returning null) when the credentials are wrong.
     * That is an expected user error, so it is not logged as ERROR.
     */
    private static PageReference siteLogin(String username, String password, String startUrl) {
        try {
            return SiteGateway.getInstance().login(username, password, startUrl);
        } catch (Exception ex) {
            Logger.info('AuthService.login', ex.getMessage());
            return null;
        }
    }

    @TestVisible
    private static String toUsername(String email) {
        return email.trim().toLowerCase() + AuthSettings.usernameSuffix();
    }

    private static void validateRegistration(RegistrationRequestDTO request) {
        if (
            request == null ||
            String.isBlank(request.lastName) ||
            String.isBlank(request.email) ||
            String.isBlank(request.password) ||
            String.isBlank(request.confirmPassword)
        ) {
            throw new AuthException(Label.Auth_Error_Required_Fields);
        }
        if (!EMAIL_PATTERN.matcher(request.email.trim()).matches()) {
            throw new AuthException(Label.Auth_Error_Invalid_Email);
        }
        if (!request.password.equals(request.confirmPassword)) {
            throw new AuthException(Label.Auth_Error_Password_Mismatch);
        }
    }

    private static User buildUser(RegistrationRequestDTO request, String email) {
        String firstName = String.isBlank(request.firstName) ? null : request.firstName.trim();
        String lastName = request.lastName.trim();
        String randomPart = String.valueOf(Math.abs(Crypto.getRandomInteger()));
        String nickname = ((firstName == null ? '' : firstName.left(1)) +
            lastName.left(1) +
            randomPart)
            .left(40);

        User user = new User(
            Username = toUsername(email),
            Email = email,
            FirstName = firstName,
            LastName = lastName,
            CommunityNickname = nickname
        );
        // No ProfileId here: it is not writeable for the guest user. Site.createPortalUser assigns the
        // network's self-registration profile (Network.selfRegProfile = Expense Community User).
        return user;
    }

    private static void validatePassword(User user, RegistrationRequestDTO request) {
        try {
            SiteGateway.getInstance()
                .validatePassword(user, request.password, request.confirmPassword);
        } catch (Exception ex) {
            // Site.validatePassword reports password policy violations with a user-readable message.
            throw new AuthException(ex.getMessage());
        }
    }

    private static Id createAccountAndUser(User user, RegistrationRequestDTO request) {
        Savepoint sp = Database.setSavepoint();
        try {
            // One Account per user: no shared account, no data skew. System mode because the guest user
            // that performs self-registration has no Account create permission.
            Account account = new Account(
                Name = (String.isBlank(user.FirstName) ? '' : user.FirstName + ' ') + user.LastName
            );
            insert as system account;
            return SiteGateway.getInstance().createPortalUser(user, account.Id, request.password);
        } catch (Exception ex) {
            Database.rollback(sp);
            String message = ex.getMessage() == null ? '' : ex.getMessage().toLowerCase();
            if (message.contains('already exists') || message.contains('duplicate')) {
                throw new AuthException(Label.Auth_Error_User_Exists);
            }
            throw ex;
        }
    }
}
