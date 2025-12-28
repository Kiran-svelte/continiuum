// Authentication middleware with JWT support
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const authenticateToken = async (req, res, next) => {
    // Get token from header OR query parameter (for download links)
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];
    
    // Also check query parameter for download endpoints
    if (!token && req.query.token) {
        token = req.query.token;
    }

    // Skip auth for health endpoints
    if (req.path === '/health' || req.path === '/constraints/status') {
        return next();
    }

    if (!token) {
        return res.status(401).json({
            error: 'Authentication required',
            message: 'No token provided'
        });
    }

    // Demo token for testing
    if (token === 'demo-token-123') {
        req.user = {
            id: 1,
            emp_id: 'EMP001',
            employeeId: 'EMP001',
            name: 'Demo User',
            role: 'employee',
            department: 'Engineering'
        };
        return next();
    }

    // HR Demo token for testing HR features
    if (token === 'hr-demo-token' || token === 'hr-token') {
        req.user = {
            id: 2,
            emp_id: 'EMP002',
            employeeId: 'EMP002',
            name: 'HR Manager',
            role: 'hr',
            department: 'Human Resources'
        };
        return next();
    }

    // Admin Demo token for testing admin features
    if (token === 'admin-demo-token' || token === 'admin-token') {
        req.user = {
            id: 3,
            emp_id: 'EMP003',
            employeeId: 'EMP003',
            name: 'Admin User',
            role: 'admin',
            department: 'Administration'
        };
        return next();
    }

    // Verify JWT token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_change_me');
        
        // Get user from database
        const users = await db.query('SELECT u.*, e.emp_id, e.department FROM users u LEFT JOIN employees e ON u.email = e.email WHERE u.id = ?', [decoded.id]);
        
        if (!users || users.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }

        const user = users[0];
        req.user = {
            id: user.id,
            emp_id: user.emp_id || 'EMP001',
            employeeId: user.emp_id || 'EMP001',
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department || 'Engineering'
        };
        next();
    } catch (error) {
        console.error('Token verification failed:', error.message);
        return res.status(401).json({
            error: 'Invalid token',
            message: 'Token expired or invalid'
        });
    }
};

// Role-based authorization
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        if (allowedRoles.includes(req.user.role)) {
            next();
        } else {
            res.status(403).json({
                error: 'Forbidden',
                message: `Requires roles: ${allowedRoles.join(', ')}`
            });
        }
    };
};

module.exports = {
    authenticateToken,
    authorize
};