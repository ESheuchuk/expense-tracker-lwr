/**
 * SOQL for User records.
 */
public with sharing class UserSelector {
    /**
     * System mode: called from guest context (password reset), where other users are not visible.
     * Returns only a boolean, so no user data leaks to the caller.
     */
    public static Boolean isActiveUsername(String username) {
        return [
                SELECT COUNT()
                FROM User
                WHERE Username = :username AND IsActive = TRUE
                WITH SYSTEM_MODE
            ] > 0;
    }
}
