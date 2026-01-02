/**
 * Unit Tests - Validation Middleware
 */

const {
    validate,
    validateIdParam,
    sanitizeString,
    isValidEmail,
    isValidDate,
    isValidId
} = require('../../src/middleware/validation.middleware');

describe('Validation Middleware - Unit Tests', () => {
    
    describe('sanitizeString', () => {
        test('should trim whitespace', () => {
            expect(sanitizeString('  hello  ')).toBe('hello');
        });
        
        test('should remove HTML tags', () => {
            expect(sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
        });
        
        test('should handle non-string input', () => {
            expect(sanitizeString(123)).toBe(123);
            expect(sanitizeString(null)).toBe(null);
        });
        
        test('should limit string length', () => {
            const longString = 'a'.repeat(20000);
            expect(sanitizeString(longString).length).toBe(10000);
        });
    });
    
    describe('isValidEmail', () => {
        test('should accept valid emails', () => {
            expect(isValidEmail('test@example.com')).toBe(true);
            expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
            expect(isValidEmail('user+tag@gmail.com')).toBe(true);
        });
        
        test('should reject invalid emails', () => {
            expect(isValidEmail('notanemail')).toBe(false);
            expect(isValidEmail('missing@domain')).toBe(false);
            expect(isValidEmail('@nodomain.com')).toBe(false);
            expect(isValidEmail('')).toBe(false);
        });
    });
    
    describe('isValidDate', () => {
        test('should accept valid dates', () => {
            expect(isValidDate('2024-01-15')).toBe(true);
            expect(isValidDate('2024-12-31')).toBe(true);
        });
        
        test('should reject invalid dates', () => {
            expect(isValidDate('not-a-date')).toBe(false);
            expect(isValidDate('')).toBe(false);
            expect(isValidDate(null)).toBe(false);
        });
    });
    
    describe('isValidId', () => {
        test('should accept valid IDs', () => {
            expect(isValidId(1)).toBe(true);
            expect(isValidId(999)).toBe(true);
            expect(isValidId('123')).toBe(true);
        });
        
        test('should reject invalid IDs', () => {
            expect(isValidId(0)).toBe(false);
            expect(isValidId(-1)).toBe(false);
            expect(isValidId('abc')).toBe(false);
            expect(isValidId(null)).toBe(false);
        });
    });
    
    describe('validate middleware', () => {
        let mockReq, mockRes, mockNext;
        
        beforeEach(() => {
            mockReq = { body: {} };
            mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            mockNext = jest.fn();
        });
        
        test('should pass valid login data', () => {
            mockReq.body = {
                email: 'test@example.com',
                password: 'password123'
            };
            
            const middleware = validate('login');
            middleware(mockReq, mockRes, mockNext);
            
            expect(mockNext).toHaveBeenCalled();
            expect(mockRes.status).not.toHaveBeenCalled();
        });
        
        test('should reject missing required fields', () => {
            mockReq.body = { email: 'test@example.com' };
            
            const middleware = validate('login');
            middleware(mockReq, mockRes, mockNext);
            
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: 'Validation Error'
                })
            );
        });
        
        test('should reject invalid email format', () => {
            mockReq.body = {
                email: 'not-an-email',
                password: 'password123'
            };
            
            const middleware = validate('login');
            middleware(mockReq, mockRes, mockNext);
            
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });
    });
    
    describe('validateIdParam middleware', () => {
        let mockReq, mockRes, mockNext;
        
        beforeEach(() => {
            mockReq = { params: {} };
            mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            mockNext = jest.fn();
        });
        
        test('should pass valid ID', () => {
            mockReq.params = { id: '123' };
            
            const middleware = validateIdParam('id');
            middleware(mockReq, mockRes, mockNext);
            
            expect(mockNext).toHaveBeenCalled();
        });
        
        test('should reject invalid ID', () => {
            mockReq.params = { id: 'abc' };
            
            const middleware = validateIdParam('id');
            middleware(mockReq, mockRes, mockNext);
            
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });
    });
});
