const express = require('express');
const router = express.Router({ mergeParams: true });
const pool = require('../db/pool');
const { verifyToken } = require('../middleware/auth');

// GET /api/patients/:id/photos
router.get('/', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT p.id, p.patient_id, p.photo_data, p.photo_type, p.label, p.notes,
                    p.uploaded_at, a.full_name AS uploaded_by_name
             FROM patient_photos p
             LEFT JOIN admins a ON p.uploaded_by = a.id
             WHERE p.patient_id = $1
             ORDER BY p.uploaded_at DESC`,
            [id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('GET photos error:', err);
        res.status(500).json({ error: 'Failed to fetch photos' });
    }
});

// POST /api/patients/:id/photos
router.post('/', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { photo_data, photo_type = 'other', label, notes } = req.body;

        if (!photo_data || !photo_data.startsWith('data:image/')) {
            return res.status(400).json({ error: 'Invalid photo data' });
        }

        const validTypes = ['before', 'after', 'xray', 'intraoral', 'panoramic', 'other'];
        if (!validTypes.includes(photo_type)) {
            return res.status(400).json({ error: 'Invalid photo type' });
        }

        const result = await pool.query(
            `INSERT INTO patient_photos (patient_id, photo_data, photo_type, label, notes, uploaded_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, patient_id, photo_type, label, notes, uploaded_at`,
            [id, photo_data, photo_type, label || null, notes || null, req.admin.id]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('POST photo error:', err);
        res.status(500).json({ error: 'Failed to save photo' });
    }
});

// DELETE /api/patients/:id/photos/:photoId
router.delete('/:photoId', verifyToken, async (req, res) => {
    try {
        const { id, photoId } = req.params;
        const result = await pool.query(
            'DELETE FROM patient_photos WHERE id = $1 AND patient_id = $2 RETURNING id',
            [photoId, id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Photo not found' });
        }
        res.json({ message: 'Photo deleted' });
    } catch (err) {
        console.error('DELETE photo error:', err);
        res.status(500).json({ error: 'Failed to delete photo' });
    }
});

module.exports = router;
