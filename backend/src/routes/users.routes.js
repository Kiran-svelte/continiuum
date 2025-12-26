const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');

// Placeholder routes
router.get('/', authenticateToken, (req, res) => {
    res.json({ message: 'Users endpoint - coming soon' });
});

module.exports = router;
