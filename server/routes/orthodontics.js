const express = require('express');
const router = express.Router({ mergeParams: true });
const pool = require('../db/pool');
const { verifyToken } = require('../middleware/auth');

// GET /api/patients/:id/orthodontics
router.get('/', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const caseRes = await pool.query(
            `SELECT oc.*, a.full_name AS dentist_name,
                    (oc.total_cost - oc.total_paid) AS remaining
             FROM orthodontic_cases oc
             LEFT JOIN admins a ON oc.dentist_id = a.id
             WHERE oc.patient_id = $1`,
            [id]
        );
        if (caseRes.rows.length === 0) return res.json({ case: null, adjustments: [] });

        const orthoCase = caseRes.rows[0];
        const adjRes = await pool.query(
            `SELECT oa.*, a.full_name AS performed_by_name
             FROM orthodontic_adjustments oa
             LEFT JOIN admins a ON oa.performed_by = a.id
             WHERE oa.patient_id = $1
             ORDER BY oa.adjustment_date DESC`,
            [id]
        );
        res.json({ case: orthoCase, adjustments: adjRes.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/patients/:id/orthodontics
router.post('/', verifyToken, async (req, res) => {
    const { bracket_type, start_date, estimated_end_date, total_cost, downpayment, notes } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO orthodontic_cases
               (patient_id, dentist_id, bracket_type, start_date, estimated_end_date,
                total_cost, downpayment, total_paid, status, notes, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$8,$9,$2)
             RETURNING *`,
            [
                req.params.id, req.admin.id,
                bracket_type || 'metal',
                start_date || null,
                estimated_end_date || null,
                parseFloat(total_cost) || 0,
                parseFloat(downpayment) || 0,
                'active',
                notes || null,
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/patients/:id/orthodontics/:caseId
router.put('/:caseId', verifyToken, async (req, res) => {
    const {
        bracket_type, start_date, estimated_end_date, actual_end_date,
        total_cost, downpayment, total_paid, status, notes,
    } = req.body;
    try {
        const result = await pool.query(
            `UPDATE orthodontic_cases SET
               bracket_type=$1, start_date=$2, estimated_end_date=$3, actual_end_date=$4,
               total_cost=$5, downpayment=$6, total_paid=$7, status=$8, notes=$9,
               updated_at=NOW()
             WHERE id=$10 AND patient_id=$11
             RETURNING *, (total_cost - total_paid) AS remaining`,
            [
                bracket_type || 'metal',
                start_date || null,
                estimated_end_date || null,
                actual_end_date || null,
                parseFloat(total_cost) || 0,
                parseFloat(downpayment) || 0,
                parseFloat(total_paid) || 0,
                status || 'active',
                notes || null,
                req.params.caseId,
                req.params.id,
            ]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Case not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/patients/:id/orthodontics/:caseId/adjustments
router.post('/:caseId/adjustments', verifyToken, async (req, res) => {
    const { adjustment_date, notes, next_adjustment_date } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO orthodontic_adjustments
               (case_id, patient_id, adjustment_date, notes, next_adjustment_date, performed_by)
             VALUES ($1,$2,$3,$4,$5,$6)
             RETURNING *`,
            [
                req.params.caseId,
                req.params.id,
                adjustment_date || new Date().toISOString().slice(0, 10),
                notes || null,
                next_adjustment_date || null,
                req.admin.id,
            ]
        );
        const full = await pool.query(
            `SELECT oa.*, a.full_name AS performed_by_name
             FROM orthodontic_adjustments oa
             LEFT JOIN admins a ON oa.performed_by = a.id
             WHERE oa.id = $1`,
            [result.rows[0].id]
        );
        res.status(201).json(full.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/patients/:id/orthodontics/:caseId/adjustments/:adjId
router.put('/:caseId/adjustments/:adjId', verifyToken, async (req, res) => {
    const { adjustment_date, notes, next_adjustment_date } = req.body;
    try {
        const result = await pool.query(
            `UPDATE orthodontic_adjustments SET
               adjustment_date=$1, notes=$2, next_adjustment_date=$3
             WHERE id=$4
             RETURNING *`,
            [
                adjustment_date,
                notes || null,
                next_adjustment_date || null,
                req.params.adjId,
            ]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Adjustment not found' });
        const full = await pool.query(
            `SELECT oa.*, a.full_name AS performed_by_name
             FROM orthodontic_adjustments oa
             LEFT JOIN admins a ON oa.performed_by = a.id
             WHERE oa.id = $1`,
            [result.rows[0].id]
        );
        res.json(full.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/patients/:id/orthodontics/:caseId/adjustments/:adjId
router.delete('/:caseId/adjustments/:adjId', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM orthodontic_adjustments WHERE id=$1 RETURNING id',
            [req.params.adjId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Adjustment not found' });
        res.json({ message: 'Adjustment deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
