/**
 * Thin @AuraEnabled facade for the login, registration and password reset LWC components.
 * Expected problems (AuthException) are shown to the user; anything else is logged and masked.
 * Buffered log entries are always flushed, so service-level INFO/WARN entries are not lost.
 */
public with sharing class AuthController {
    @AuraEnabled
    public static AuthResultDTO login(LoginRequestDTO request) {
        try {
            return AuthService.login(request);
        } catch (AuthException ex) {
            throw toAuraException(ex.getMessage());
        } catch (Exception ex) {
            Logger.error('AuthController.login', ex);
            throw toAuraException(Label.Auth_Error_Generic);
        } finally {
            Logger.flush();
        }
    }

    @AuraEnabled
    public static AuthResultDTO register(RegistrationRequestDTO request) {
        try {
            return AuthService.register(request);
        } catch (AuthException ex) {
            throw toAuraException(ex.getMessage());
        } catch (Exception ex) {
            Logger.error('AuthController.register', ex);
            throw toAuraException(Label.Auth_Error_Generic);
        } finally {
            Logger.flush();
        }
    }

    @AuraEnabled
    public static void forgotPassword(ForgotPasswordRequestDTO request) {
        try {
            AuthService.forgotPassword(request);
        } catch (AuthException ex) {
            throw toAuraException(ex.getMessage());
        } catch (Exception ex) {
            Logger.error('AuthController.forgotPassword', ex);
            throw toAuraException(Label.Auth_Error_Generic);
        } finally {
            Logger.flush();
        }
    }

    private static AuraHandledException toAuraException(String message) {
        AuraHandledException result = new AuraHandledException(message);
        result.setMessage(message);
        return result;
    }
}
