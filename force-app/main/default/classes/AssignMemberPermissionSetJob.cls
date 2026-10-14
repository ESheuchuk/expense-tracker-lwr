/**
 * Assigns the member permission set to a freshly self-registered user.
 * Runs asynchronously because PermissionSetAssignment is a setup object (mixed DML with Account).
 */
public with sharing class AssignMemberPermissionSetJob implements Queueable {
    private final Id userId;
    private final String permissionSetName;

    public AssignMemberPermissionSetJob(Id userId, String permissionSetName) {
        this.userId = userId;
        this.permissionSetName = permissionSetName;
    }

    public void execute(QueueableContext context) {
        try {
            // System mode: PermissionSet is a setup object not readable by community users.
            List<PermissionSet> sets = [
                SELECT Id
                FROM PermissionSet
                WHERE Name = :permissionSetName
                WITH SYSTEM_MODE
                LIMIT 1
            ];
            if (sets.isEmpty()) {
                Logger.error(
                    'AssignMemberPermissionSetJob',
                    'Permission set not found: ' + permissionSetName
                );
                return;
            }
            Database.SaveResult result = Database.insert(
                new PermissionSetAssignment(AssigneeId = userId, PermissionSetId = sets[0].Id),
                false,
                AccessLevel.SYSTEM_MODE
            );
            if (!result.isSuccess()) {
                Logger.error(
                    'AssignMemberPermissionSetJob',
                    'Assignment failed for user ' +
                        userId +
                        ': ' +
                        result.getErrors()[0].getMessage()
                );
            }
        } catch (Exception ex) {
            Logger.error('AssignMemberPermissionSetJob', ex);
        } finally {
            Logger.flush();
        }
    }
}
