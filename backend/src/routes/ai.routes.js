const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');

// Placeholder routes
router.get('/status', authenticateToken, (req, res) => {
    res.json({
        message: 'AI services status',
        services: {
            constraint_engine: 'http://localhost:8001',
            status: 'operational'
        }
    });
});

module.exports = router;
