/**
 * Central Apex logger. Entries are buffered and published as Log_Event__e (Publish Immediately),
 * so they survive transaction rollback and can be written from guest context.
 * Usage in controllers: Logger.error(source, e); Logger.flush();
 */
public with sharing class Logger {
    private static final Integer MAX_LONG_TEXT = 32768;
    private static final List<Log_Event__e> BUFFER = new List<Log_Event__e>();

    public static void error(String source, Exception ex) {
        error(source, ex, null);
    }

    public static void error(String source, Exception ex, Map<String, Object> context) {
        add(LogLevel.ERROR, source, ex.getMessage(), ex, context);
    }

    public static void error(String source, String message) {
        add(LogLevel.ERROR, source, message, null, null);
    }

    public static void warn(String source, String message) {
        add(LogLevel.WARN, source, message, null, null);
    }

    public static void info(String source, String message) {
        add(LogLevel.INFO, source, message, null, null);
    }

    public static void debug(String source, String message) {
        add(LogLevel.DEBUG, source, message, null, null);
    }

    /**
     * Publishes buffered entries. Never throws: logging must not break the business flow.
     */
    public static void flush() {
        if (BUFFER.isEmpty()) {
            return;
        }
        List<Log_Event__e> events = BUFFER.clone();
        BUFFER.clear();
        try {
            List<Database.SaveResult> results = EventBus.publish(events);
            for (Database.SaveResult result : results) {
                if (!result.isSuccess()) {
                    System.debug(
                        LoggingLevel.ERROR,
                        'Logger publish failed: ' + result.getErrors()
                    );
                }
            }
        } catch (Exception ex) {
            System.debug(LoggingLevel.ERROR, 'Logger flush failed: ' + ex.getMessage());
        }
    }

    @TestVisible
    private static Integer bufferSize() {
        return BUFFER.size();
    }

    private static void add(
        LogLevel level,
        String source,
        String message,
        Exception ex,
        Map<String, Object> context
    ) {
        if (level.ordinal() >= LoggerSettings.debugLevel().ordinal()) {
            System.debug(toSystemLevel(level), '[' + source + '] ' + message);
        }
        if (level.ordinal() < LoggerSettings.persistLevel().ordinal()) {
            return;
        }
        Request currentRequest = Request.getCurrent();
        BUFFER.add(
            new Log_Event__e(
                Level__c = level.name(),
                Source__c = truncate(source, 255),
                Message__c = truncate(message, MAX_LONG_TEXT),
                Stack_Trace__c = ex == null
                    ? null
                    : truncate(ex.getStackTraceString(), MAX_LONG_TEXT),
                Exception_Type__c = ex == null ? null : ex.getTypeName(),
                Running_User_Id__c = UserInfo.getUserId(),
                Request_Id__c = currentRequest.getRequestId(),
                Quiddity__c = currentRequest.getQuiddity().name(),
                Context__c = context == null
                    ? null
                    : truncate(JSON.serialize(context), MAX_LONG_TEXT)
            )
        );
    }

    private static System.LoggingLevel toSystemLevel(LogLevel level) {
        switch on level {
            when ERROR {
                return System.LoggingLevel.ERROR;
            }
            when WARN {
                return System.LoggingLevel.WARN;
            }
            when INFO {
                return System.LoggingLevel.INFO;
            }
            when else {
                return System.LoggingLevel.DEBUG;
            }
        }
    }

    private static String truncate(String value, Integer maxLength) {
        return value == null ? null : value.abbreviate(maxLength);
    }
}
