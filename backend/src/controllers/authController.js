const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET || 'secret_key_change_me', {
        expiresIn: '30d',
    });
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password' });
    }

    try {
        const users = await db.query('SELECT * FROM users WHERE email = ?', [email]);

        if (!users || users.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = users[0];

        // Check if user is active
        if (user.is_active === 0) {
            return res.status(403).json({ message: 'Account is inactive' });
        }

        // Verify Password
        // Laravel uses bcrypt, so bcryptjs should retrieve it correctly
        // Note: Laravel hashes are $2y$, bcryptjs generates $2a$ or $2b$, but usually can compare $2y$
        // If not, we might need a specific library or manually replace $2y$ with $2a$ for compatibility check

        let isMatch = false;
        // Replace $2y$ with $2a$ for bcryptjs compatibility if needed, but try direct first
        isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            // Fallback: try replacing $2y$ with $2b$ or $2a$ just in case
            const phpHash = user.password.replace(/^\$2y(.+)$/i, '$2a$1');
            isMatch = await bcrypt.compare(password, phpHash);
        }

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Update last login
        await db.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user.id, user.role),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ int_message: 'Server error', error: error.message, stack: error.stack });
    }
};

exports.getMe = async (req, res) => {
    try {
        const users = await db.query('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
        if (!users || users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(users[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
