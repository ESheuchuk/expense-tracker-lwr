/**
 * Thin wrapper over Site.* statics so they can be stubbed in tests.
 */
public virtual with sharing class SiteGateway {
    @TestVisible
    private static SiteGateway instance = new SiteGateway();

    public static SiteGateway getInstance() {
        return instance;
    }

    public virtual PageReference login(String username, String password, String startUrl) {
        return Site.login(username, password, startUrl);
    }

    public virtual Id createPortalUser(User user, Id accountId, String password) {
        return Site.createPortalUser(user, accountId, password);
    }

    public virtual Boolean forgotPassword(String username) {
        return Site.forgotPassword(username);
    }

    public virtual void validatePassword(User user, String password, String confirmPassword) {
        Site.validatePassword(user, password, confirmPassword);
    }
}
