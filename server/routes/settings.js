const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken } = require('../middleware/auth');

// All routes require authentication
router.use(verifyToken);

// Middleware: admin-only
function requireAdmin(req, res, next) {
    if (req.admin.role !== 'admin') {
        return res.status(403).json({ error: 'Admin role required' });
    }
    next();
}

// ─── Profile ──────────────────────────────────────────────────────────────────

// GET /api/settings/profile
router.get('/profile', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, email, full_name, role, created_at, last_login FROM admins WHERE id = $1',
            [req.admin.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Admin not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/settings/profile
router.put('/profile',
    body('full_name').trim().notEmpty().withMessage('Full name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { full_name, email, username } = req.body;
        try {
            // Check username/email uniqueness (excluding self)
            const conflict = await pool.query(
                'SELECT id FROM admins WHERE (username = $1 OR email = $2) AND id != $3',
                [username, email, req.admin.id]
            );
            if (conflict.rows.length > 0) {
                return res.status(409).json({ error: 'Username or email already in use' });
            }

            const result = await pool.query(
                `UPDATE admins
                 SET full_name = $1, email = $2, username = $3
                 WHERE id = $4
                 RETURNING id, username, email, full_name, role`,
                [full_name, email, username, req.admin.id]
            );
            res.json(result.rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Server error' });
        }
    }
);

// ─── Clinic Settings ──────────────────────────────────────────────────────────

// GET /api/settings/clinic
router.get('/clinic', async (req, res) => {
    try {
        let result = await pool.query('SELECT * FROM clinic_settings LIMIT 1');
        if (result.rows.length === 0) {
            // Insert default row on first access
            result = await pool.query(
                `INSERT INTO clinic_settings (clinic_name) VALUES ('Dental Clinic') RETURNING *`
            );
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/settings/clinic
router.put('/clinic',
    body('clinic_name').trim().notEmpty().withMessage('Clinic name is required'),
    body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { clinic_name, address, phone, email, website } = req.body;
        try {
            // Ensure a row exists
            const existing = await pool.query('SELECT id FROM clinic_settings LIMIT 1');
            let result;
            if (existing.rows.length === 0) {
                result = await pool.query(
                    `INSERT INTO clinic_settings (clinic_name, address, phone, email, website, updated_at)
                     VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
                    [clinic_name, address || null, phone || null, email || null, website || null]
                );
            } else {
                result = await pool.query(
                    `UPDATE clinic_settings
                     SET clinic_name = $1, address = $2, phone = $3, email = $4, website = $5, updated_at = NOW()
                     WHERE id = $6 RETURNING *`,
                    [clinic_name, address || null, phone || null, email || null, website || null, existing.rows[0].id]
                );
            }
            res.json(result.rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Server error' });
        }
    }
);

// ─── User Management ──────────────────────────────────────────────────────────

// GET /api/settings/users (admin-only)
router.get('/users', requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, username, email, full_name, role, is_active, created_at, last_login
             FROM admins ORDER BY created_at ASC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/settings/users (admin-only)
router.post('/users', requireAdmin,
    body('full_name').trim().notEmpty().withMessage('Full name is required'),
    body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['admin', 'dentist', 'hygienist', 'receptionist']).withMessage('Invalid role'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { full_name, username, email, password, role } = req.body;
        try {
            const conflict = await pool.query(
                'SELECT id FROM admins WHERE username = $1 OR email = $2',
                [username, email]
            );
            if (conflict.rows.length > 0) {
                return res.status(409).json({ error: 'Username or email already in use' });
            }

            const password_hash = await bcrypt.hash(password, 10);
            const result = await pool.query(
                `INSERT INTO admins (full_name, username, email, password_hash, role)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id, username, email, full_name, role, is_active, created_at`,
                [full_name, username, email, password_hash, role]
            );
            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Server error' });
        }
    }
);

// PUT /api/settings/users/:id (admin-only)
router.put('/users/:id', requireAdmin,
    body('full_name').trim().notEmpty().withMessage('Full name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('role').isIn(['admin', 'dentist', 'hygienist', 'receptionist']).withMessage('Invalid role'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { id } = req.params;
        const { full_name, email, role } = req.body;
        try {
            // Prevent admin from changing their own role
            const query = req.admin.id === id
                ? `UPDATE admins SET full_name = $1, email = $2 WHERE id = $3 RETURNING id, username, email, full_name, role, is_active`
                : `UPDATE admins SET full_name = $1, email = $2, role = $3 WHERE id = $4 RETURNING id, username, email, full_name, role, is_active`;
            const params = req.admin.id === id
                ? [full_name, email, id]
                : [full_name, email, role, id];

            // Check email uniqueness
            const conflict = await pool.query(
                'SELECT id FROM admins WHERE email = $1 AND id != $2',
                [email, id]
            );
            if (conflict.rows.length > 0) {
                return res.status(409).json({ error: 'Email already in use' });
            }

            const result = await pool.query(query, params);
            if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
            res.json(result.rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Server error' });
        }
    }
);

// PATCH /api/settings/users/:id/status (admin-only)
router.patch('/users/:id/status', requireAdmin, async (req, res) => {
    const { id } = req.params;
    if (id === req.admin.id) {
        return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }
    try {
        const result = await pool.query(
            `UPDATE admins SET is_active = NOT is_active WHERE id = $1
             RETURNING id, is_active`,
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
