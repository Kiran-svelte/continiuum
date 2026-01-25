/**
 * Structured Logger Utility
 * Replaces console.log with environment-aware logging
 * 
 * Features:
 * - Log levels (debug, info, warn, error)
 * - Environment filtering (no debug in production)
 * - Contextual metadata
 * - PII sanitization in production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
    module?: string;
    action?: string;
    userId?: string;
    orgId?: string;
    requestId?: string;
    [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

// Get minimum log level from environment
function getMinLogLevel(): number {
    if (process.env.NODE_ENV === 'production') {
        return LOG_LEVELS.warn; // Only warn and error in production
    }
    if (process.env.NODE_ENV === 'test') {
        return LOG_LEVELS.error; // Only errors in test
    }
    return LOG_LEVELS.debug; // All logs in development
}

// Sanitize sensitive data in production
function sanitizeForProduction(data: unknown): unknown {
    if (process.env.NODE_ENV !== 'production') {
        return data;
    }
    
    if (typeof data !== 'object' || data === null) {
        return data;
    }
    
    const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'authorization', 'email', 'phone'];
    const sanitized = { ...data as Record<string, unknown> };
    
    for (const key of Object.keys(sanitized)) {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
            sanitized[key] = '[REDACTED]';
        }
    }
    
    return sanitized;
}

// Format log message
function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (context?.module) {
        return `${prefix} [${context.module}] ${message}`;
    }
    
    return `${prefix} ${message}`;
}

// Main logger class
class Logger {
    private minLevel: number;
    
    constructor() {
        this.minLevel = getMinLogLevel();
    }
    
    private shouldLog(level: LogLevel): boolean {
        return LOG_LEVELS[level] >= this.minLevel;
    }
    
    private log(level: LogLevel, message: string, context?: LogContext, data?: unknown): void {
        if (!this.shouldLog(level)) {
            return;
        }
        
        const formattedMessage = formatMessage(level, message, context);
        const sanitizedData = sanitizeForProduction(data);
        
        const logFn = level === 'error' ? console.error 
                    : level === 'warn' ? console.warn 
                    : console.log;
        
        if (sanitizedData !== undefined) {
            logFn(formattedMessage, sanitizedData);
        } else {
            logFn(formattedMessage);
        }
    }
    
    /**
     * Debug level - Only visible in development
     */
    debug(message: string, context?: LogContext, data?: unknown): void {
        this.log('debug', message, context, data);
    }
    
    /**
     * Info level - General operational messages
     */
    info(message: string, context?: LogContext, data?: unknown): void {
        this.log('info', message, context, data);
    }
    
    /**
     * Warn level - Potential issues that don't break functionality
     */
    warn(message: string, context?: LogContext, data?: unknown): void {
        this.log('warn', message, context, data);
    }
    
    /**
     * Error level - Errors that need attention
     */
    error(message: string, context?: LogContext, error?: unknown): void {
        const errorData = error instanceof Error 
            ? { name: error.name, message: error.message, stack: error.stack }
            : error;
        this.log('error', message, context, errorData);
    }
    
    /**
     * Create a child logger with preset context
     */
    child(module: string): ModuleLogger {
        return new ModuleLogger(this, module);
    }
}

// Module-specific logger with preset context
class ModuleLogger {
    constructor(private parent: Logger, private module: string) {}
    
    debug(message: string, data?: unknown): void {
        this.parent.debug(message, { module: this.module }, data);
    }
    
    info(message: string, data?: unknown): void {
        this.parent.info(message, { module: this.module }, data);
    }
    
    warn(message: string, data?: unknown): void {
        this.parent.warn(message, { module: this.module }, data);
    }
    
    error(message: string, error?: unknown): void {
        this.parent.error(message, { module: this.module }, error);
    }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const log = {
    debug: (message: string, data?: unknown) => logger.debug(message, undefined, data),
    info: (message: string, data?: unknown) => logger.info(message, undefined, data),
    warn: (message: string, data?: unknown) => logger.warn(message, undefined, data),
    error: (message: string, error?: unknown) => logger.error(message, undefined, error),
};

// Export typed module loggers for common modules
export const apiLogger = logger.child('API');
export const authLogger = logger.child('Auth');
export const aiLogger = logger.child('AI');
export const billingLogger = logger.child('Billing');
export const leaveLogger = logger.child('Leave');
export const attendanceLogger = logger.child('Attendance');
export const auditLogger = logger.child('Audit');
