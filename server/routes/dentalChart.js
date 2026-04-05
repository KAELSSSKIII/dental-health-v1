const express = require('express');
const router = express.Router({ mergeParams: true });
const pool = require('../db/pool');
const { verifyToken } = require('../middleware/auth');

// Helper: ensure all 32 teeth exist for a patient
async function ensureTeeth(patientId, adminId) {
    const existing = await pool.query(
        'SELECT tooth_number FROM dental_chart WHERE patient_id = $1',
        [patientId]
    );
    const existingNums = new Set(existing.rows.map(r => r.tooth_number));
    const missing = [];
    for (let i = 1; i <= 32; i++) {
        if (!existingNums.has(i)) missing.push(i);
    }
    if (missing.length > 0) {
        const values = missing.map((n, i) =>
            `($1, $${i + 2}, 'healthy', $${missing.length + 2})`
        ).join(', ');
        const params = [patientId, ...missing, adminId];
        await pool.query(
            `INSERT INTO dental_chart (patient_id, tooth_number, status, updated_by) VALUES ${values} ON CONFLICT DO NOTHING`,
            params
        );
    }
}

// GET /api/patients/:id/dental-chart
router.get('/', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        await ensureTeeth(id, req.admin.id);
        const result = await pool.query(
            `SELECT dc.*, a.full_name AS updated_by_name
       FROM dental_chart dc
       LEFT JOIN admins a ON dc.updated_by = a.id
       WHERE dc.patient_id = $1
       ORDER BY dc.tooth_number`,
            [id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/patients/:id/dental-chart/bulk
router.put('/bulk', verifyToken, async (req, res) => {
    const { teeth } = req.body;
    if (!Array.isArray(teeth)) return res.status(400).json({ error: 'teeth must be an array' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const t of teeth) {
            await client.query(`
        INSERT INTO dental_chart (patient_id, tooth_number, status, surface, notes, updated_by, last_updated)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (patient_id, tooth_number) DO UPDATE SET
          status = EXCLUDED.status,
          surface = EXCLUDED.surface,
          notes = EXCLUDED.notes,
          updated_by = EXCLUDED.updated_by,
          last_updated = NOW()
      `, [req.params.id, t.tooth_number, t.status || 'healthy', t.surface || null, t.notes || null, req.admin.id]);
        }
        await client.query('COMMIT');

        const result = await pool.query(
            'SELECT * FROM dental_chart WHERE patient_id = $1 ORDER BY tooth_number',
            [req.params.id]
        );
        res.json(result.rows);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
});

// PUT /api/patients/:id/dental-chart/:toothNumber
router.put('/:toothNumber', verifyToken, async (req, res) => {
    const { id, toothNumber } = req.params;
    const { status, surface, notes } = req.body;

    try {
        const result = await pool.query(`
      INSERT INTO dental_chart (patient_id, tooth_number, status, surface, notes, updated_by, last_updated)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (patient_id, tooth_number) DO UPDATE SET
        status = EXCLUDED.status,
        surface = EXCLUDED.surface,
        notes = EXCLUDED.notes,
        updated_by = EXCLUDED.updated_by,
        last_updated = NOW()
      RETURNING *
    `, [id, parseInt(toothNumber), status || 'healthy', surface || null, notes || null, req.admin.id]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
