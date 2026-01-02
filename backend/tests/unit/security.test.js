/**
 * Unit Tests - Security Middleware
 */

require('dotenv').config();

const {
    validatePassword,
    isAccountLocked,
    recordFailedAttempt,
    clearFailedAttempts
} = require('../../src/middleware/security.middleware');

// Get current settings from env
const MIN_LENGTH = parseInt(process.env.PASSWORD_MIN_LENGTH) || 8;
const REQUIRE_SPECIAL = process.env.PASSWORD_REQUIRE_SPECIAL === 'true';
const MAX_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;

describe('Security Middleware - Unit Tests', () => {
    
    describe('validatePassword', () => {
        test('should accept strong password', () => {
            // Create a password that meets all requirements
            const password = REQUIRE_SPECIAL ? 'MyStr0ng!Pass123' : 'MyStr0ngPass123';
            const result = validatePassword(password);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
        
        test('should reject short password', () => {
            const result = validatePassword('Sh1!');
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('characters'))).toBe(true);
        });
        
        test('should reject password without uppercase', () => {
            const result = validatePassword('nouppercase123!');
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('uppercase'))).toBe(true);
        });
        
        test('should reject password without number', () => {
            const result = validatePassword('NoNumbersHereAtAll!');
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('number'))).toBe(true);
        });
        
        test('should handle special character requirement based on config', () => {
            const result = validatePassword('NoSpecialChar1234');
            if (REQUIRE_SPECIAL) {
                expect(result.valid).toBe(false);
                expect(result.errors.some(e => e.includes('special'))).toBe(true);
            } else {
                // If special chars not required, this should pass length/uppercase/number
                expect(result.errors.some(e => e.includes('special'))).toBe(false);
            }
        });
        
        test('should reject common passwords', () => {
            const result = validatePassword('Password123!');
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('common'))).toBe(true);
        });
    });
    
    describe('Account Lockout', () => {
        const testEmail = 'lockout-test@example.com';
        
        beforeEach(() => {
            clearFailedAttempts(testEmail);
        });
        
        test('should not lock account initially', () => {
            const result = isAccountLocked(testEmail);
            expect(result.locked).toBe(false);
        });
        
        test('should track failed attempts', () => {
            recordFailedAttempt(testEmail);
            recordFailedAttempt(testEmail);
            recordFailedAttempt(testEmail);
            
            const result = isAccountLocked(testEmail);
            // Not locked until MAX_ATTEMPTS
            expect(result.locked).toBe(MAX_ATTEMPTS <= 3);
        });
        
        test(`should lock account after ${MAX_ATTEMPTS} failed attempts`, () => {
            for (let i = 0; i < MAX_ATTEMPTS; i++) {
                recordFailedAttempt(testEmail);
            }
            
            const result = isAccountLocked(testEmail);
            expect(result.locked).toBe(true);
            expect(result.remainingMinutes).toBeGreaterThan(0);
        });
        
        test('should clear failed attempts', () => {
            recordFailedAttempt(testEmail);
            recordFailedAttempt(testEmail);
            clearFailedAttempts(testEmail);
            
            const result = isAccountLocked(testEmail);
            expect(result.locked).toBe(false);
        });
    });
});
