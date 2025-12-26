// Simple authentication middleware for demo
// In production, use JWT tokens

const authenticateToken = (req, res, next) => {
    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // Demo token - in production, verify JWT
    if (token === 'demo-token-123' || req.path === '/health' || req.path === '/constraints/status') {
        // Add demo user data
        req.user = {
            id: 'EMP' + Math.floor(Math.random() * 1000),
            name: 'Demo User',
            role: 'employee',
            department: 'Engineering'
        };
        next();
    } else {
        res.status(401).json({
            error: 'Authentication required',
            message: 'Use token: demo-token-123'
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