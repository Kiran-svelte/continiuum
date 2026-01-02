/**
 * Authentication Security Middleware
 * 
 * Provides:
 * - Account lockout after failed attempts
 * - Password complexity validation
 * - Session management
 * - Audit logging
 */

const bcrypt = require('bcryptjs');
const db = require('../config/db');

// In-memory store for failed login attempts (use Redis in production)
const loginAttempts = new Map();

/**
 * Get failed login attempts for an email
 */
function getFailedAttempts(email) {
    const record = loginAttempts.get(email);
    if (!record) return { count: 0, lockoutUntil: null };
    
    // Clear expired lockout
    if (record.lockoutUntil && new Date() > record.lockoutUntil) {
        loginAttempts.delete(email);
        return { count: 0, lockoutUntil: null };
    }
    
    return record;
}

/**
 * Record a failed login attempt
 */
function recordFailedAttempt(email) {
    const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
    const lockoutMinutes = parseInt(process.env.LOCKOUT_DURATION_MINUTES) || 30;
    
    const record = getFailedAttempts(email);
    record.count++;
    record.lastAttempt = new Date();
    
    if (record.count >= maxAttempts) {
        record.lockoutUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
    }
    
    loginAttempts.set(email, record);
    
    // Log to database
    logSecurityEvent(email, 'failed_login', {
        attempts: record.count,
        locked: record.count >= maxAttempts
    });
    
    return record;
}

/**
 * Clear failed attempts after successful login
 */
function clearFailedAttempts(email) {
    loginAttempts.delete(email);
}

/**
 * Check if account is locked
 */
function isAccountLocked(email) {
    const record = getFailedAttempts(email);
    if (record.lockoutUntil && new Date() < record.lockoutUntil) {
        return {
            locked: true,
            remainingMinutes: Math.ceil((record.lockoutUntil - new Date()) / 60000)
        };
    }
    return { locked: false };
}

/**
 * Validate password complexity
 */
function validatePassword(password) {
    const minLength = parseInt(process.env.PASSWORD_MIN_LENGTH) || 12;
    const requireUppercase = process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false';
    const requireNumber = process.env.PASSWORD_REQUIRE_NUMBER !== 'false';
    const requireSpecial = process.env.PASSWORD_REQUIRE_SPECIAL !== 'false';
    
    const errors = [];
    
    if (password.length < minLength) {
        errors.push(`Password must be at least ${minLength} characters`);
    }
    if (requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (requireNumber && !/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    if (requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }
    
    // Check for common passwords
    const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
    if (commonPasswords.some(cp => password.toLowerCase().includes(cp))) {
        errors.push('Password is too common');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Log security events to database
 */
async function logSecurityEvent(email, eventType, details = {}) {
    try {
        await db.execute(
            `INSERT INTO security_audit_log (user_email, event_type, details, ip_address, created_at)
             VALUES (?, ?, ?, ?, NOW())`,
            [email, eventType, JSON.stringify(details), details.ip || 'unknown']
        );
    } catch (e) {
        // Table might not exist - don't crash
        console.log('Security audit log:', eventType, email);
    }
}

/**
 * Middleware to check account lockout before login
 */
function checkAccountLockout(req, res, next) {
    const { email } = req.body;
    if (!email) return next();
    
    const lockStatus = isAccountLocked(email);
    if (lockStatus.locked) {
        return res.status(423).json({
            error: 'Account Locked',
            message: `Account temporarily locked due to too many failed attempts. Try again in ${lockStatus.remainingMinutes} minutes.`
        });
    }
    
    next();
}

/**
 * Middleware to validate password on registration/change
 */
function validatePasswordMiddleware(req, res, next) {
    const { password, newPassword } = req.body;
    const passwordToCheck = newPassword || password;
    
    if (!passwordToCheck) return next();
    
    const validation = validatePassword(passwordToCheck);
    if (!validation.valid) {
        return res.status(400).json({
            error: 'Password Policy Violation',
            message: validation.errors.join('. ')
        });
    }
    
    next();
}

/**
 * Enhanced login handler with security features
 */
async function secureLogin(email, password, ip) {
    // Check lockout
    const lockStatus = isAccountLocked(email);
    if (lockStatus.locked) {
        return {
            success: false,
            error: 'Account Locked',
            message: `Try again in ${lockStatus.remainingMinutes} minutes`
        };
    }
    
    // Find user
    const users = await db.query(
        'SELECT * FROM users WHERE email = ? AND is_active = 1',
        [email]
    );
    
    if (!users || users.length === 0) {
        recordFailedAttempt(email);
        return { success: false, error: 'Invalid credentials' };
    }
    
    const user = users[0];
    
    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
        const record = recordFailedAttempt(email);
        const remainingAttempts = Math.max(0, 5 - record.count);
        return {
            success: false,
            error: 'Invalid credentials',
            remainingAttempts
        };
    }
    
    // Success - clear failed attempts
    clearFailedAttempts(email);
    
    // Log successful login
    await logSecurityEvent(email, 'login_success', { ip });
    
    // Update last login
    await db.execute(
        'UPDATE users SET last_login = NOW() WHERE id = ?',
        [user.id]
    );
    
    return {
        success: true,
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            employee_id: user.employee_id
        }
    };
}

module.exports = {
    checkAccountLockout,
    validatePasswordMiddleware,
    validatePassword,
    secureLogin,
    recordFailedAttempt,
    clearFailedAttempts,
    isAccountLocked,
    logSecurityEvent
};
