/**
 * Data Validation Middleware
 * 
 * Provides input validation for all API endpoints
 * Prevents SQL injection, XSS, and malformed data
 */

/**
 * Sanitize string input
 */
function sanitizeString(str) {
    if (typeof str !== 'string') return str;
    return str
        .trim()
        .replace(/[<>]/g, '') // Remove HTML tags
        .slice(0, 10000); // Limit length
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate date format (YYYY-MM-DD)
 */
function isValidDate(dateStr) {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date);
}

/**
 * Validate ID (positive integer)
 */
function isValidId(id) {
    const num = parseInt(id);
    return Number.isInteger(num) && num > 0;
}

/**
 * Validation schemas for different entities
 */
const schemas = {
    login: {
        email: { required: true, type: 'email' },
        password: { required: true, type: 'string', minLength: 1 }
    },
    
    register: {
        email: { required: true, type: 'email' },
        password: { required: true, type: 'string', minLength: 8 },
        name: { required: true, type: 'string', minLength: 2, maxLength: 100 },
        role: { required: false, type: 'enum', values: ['employee', 'hr', 'manager', 'admin'] }
    },
    
    employee: {
        first_name: { required: true, type: 'string', minLength: 1, maxLength: 50 },
        last_name: { required: true, type: 'string', minLength: 1, maxLength: 50 },
        email: { required: true, type: 'email' },
        department: { required: false, type: 'string', maxLength: 100 },
        position: { required: false, type: 'string', maxLength: 100 },
        hire_date: { required: false, type: 'date' },
        status: { required: false, type: 'enum', values: ['active', 'inactive', 'terminated'] }
    },
    
    leaveRequest: {
        leave_type: { required: true, type: 'enum', values: ['annual', 'sick', 'personal', 'maternity', 'paternity', 'unpaid', 'bereavement', 'other'] },
        start_date: { required: true, type: 'date' },
        end_date: { required: true, type: 'date' },
        reason: { required: false, type: 'string', maxLength: 1000 }
    },
    
    payroll: {
        employee_id: { required: true, type: 'id' },
        basic_salary: { required: true, type: 'number', min: 0 },
        allowances: { required: false, type: 'number', min: 0 },
        deductions: { required: false, type: 'number', min: 0 }
    }
};

/**
 * Validate a single field against rules
 */
function validateField(value, rules, fieldName) {
    const errors = [];
    
    // Required check
    if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${fieldName} is required`);
        return errors;
    }
    
    // Skip further validation if not required and empty
    if (!rules.required && (value === undefined || value === null || value === '')) {
        return errors;
    }
    
    // Type validation
    switch (rules.type) {
        case 'email':
            if (!isValidEmail(value)) {
                errors.push(`${fieldName} must be a valid email address`);
            }
            break;
            
        case 'date':
            if (!isValidDate(value)) {
                errors.push(`${fieldName} must be a valid date (YYYY-MM-DD)`);
            }
            break;
            
        case 'id':
            if (!isValidId(value)) {
                errors.push(`${fieldName} must be a valid ID`);
            }
            break;
            
        case 'number':
            const num = parseFloat(value);
            if (isNaN(num)) {
                errors.push(`${fieldName} must be a number`);
            } else {
                if (rules.min !== undefined && num < rules.min) {
                    errors.push(`${fieldName} must be at least ${rules.min}`);
                }
                if (rules.max !== undefined && num > rules.max) {
                    errors.push(`${fieldName} must be at most ${rules.max}`);
                }
            }
            break;
            
        case 'enum':
            if (!rules.values.includes(value)) {
                errors.push(`${fieldName} must be one of: ${rules.values.join(', ')}`);
            }
            break;
            
        case 'string':
        default:
            if (typeof value !== 'string') {
                errors.push(`${fieldName} must be a string`);
            } else {
                if (rules.minLength && value.length < rules.minLength) {
                    errors.push(`${fieldName} must be at least ${rules.minLength} characters`);
                }
                if (rules.maxLength && value.length > rules.maxLength) {
                    errors.push(`${fieldName} must be at most ${rules.maxLength} characters`);
                }
            }
    }
    
    return errors;
}

/**
 * Validate request body against schema
 */
function validate(schemaName) {
    return (req, res, next) => {
        const schema = schemas[schemaName];
        if (!schema) {
            console.warn(`Unknown validation schema: ${schemaName}`);
            return next();
        }
        
        const errors = [];
        const sanitizedBody = {};
        
        for (const [fieldName, rules] of Object.entries(schema)) {
            let value = req.body[fieldName];
            
            // Sanitize string inputs
            if (typeof value === 'string') {
                value = sanitizeString(value);
            }
            
            const fieldErrors = validateField(value, rules, fieldName);
            errors.push(...fieldErrors);
            
            // Add sanitized value to body
            if (value !== undefined) {
                sanitizedBody[fieldName] = value;
            }
        }
        
        if (errors.length > 0) {
            return res.status(400).json({
                error: 'Validation Error',
                message: errors.join('; '),
                details: errors
            });
        }
        
        // Replace body with sanitized version
        req.body = { ...req.body, ...sanitizedBody };
        next();
    };
}

/**
 * Validate ID parameter
 */
function validateIdParam(paramName = 'id') {
    return (req, res, next) => {
        const id = req.params[paramName];
        if (!isValidId(id)) {
            return res.status(400).json({
                error: 'Invalid Parameter',
                message: `${paramName} must be a valid positive integer`
            });
        }
        next();
    };
}

/**
 * Custom date range validation for leave requests
 */
function validateDateRange(req, res, next) {
    const { start_date, end_date } = req.body;
    
    if (start_date && end_date) {
        const start = new Date(start_date);
        const end = new Date(end_date);
        
        if (end < start) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'End date cannot be before start date'
            });
        }
        
        // Check if dates are not in the past (for new requests)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (start < today && !req.params.id) { // Allow editing past requests
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Start date cannot be in the past'
            });
        }
        
        // Check max leave duration (e.g., 30 days)
        const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        if (diffDays > 30) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Leave duration cannot exceed 30 days. Please submit multiple requests.'
            });
        }
    }
    
    next();
}

module.exports = {
    validate,
    validateIdParam,
    validateDateRange,
    sanitizeString,
    isValidEmail,
    isValidDate,
    isValidId,
    schemas
};
