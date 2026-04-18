const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// GET /api/intake/status/:slug — public: validate slug + return form config
router.get('/status/:slug', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT intake_enabled, intake_slug, intake_redirect_url FROM clinic_settings LIMIT 1'
        );
        if (result.rows.length === 0 || !result.rows[0].intake_slug) {
            return res.status(404).json({ error: 'Form not found' });
        }
        const { intake_enabled, intake_slug, intake_redirect_url } = result.rows[0];
        if (intake_slug !== req.params.slug) {
            return res.status(404).json({ error: 'Form not found' });
        }
        if (!intake_enabled) {
            return res.status(403).json({ error: 'Form is currently unavailable', disabled: true });
        }
        res.json({ enabled: true, redirect_url: intake_redirect_url || null });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
