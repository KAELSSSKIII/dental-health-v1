const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken } = require('../middleware/auth');

// GET /api/appointments/staff — list active staff for dentist dropdown
router.get('/staff', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, full_name, role FROM admins WHERE is_active = true ORDER BY full_name`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/appointments?start=ISO&end=ISO
router.get('/', verifyToken, async (req, res) => {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end query params are required' });
    try {
        const result = await pool.query(`
            SELECT a.*,
                   p.first_name, p.last_name, p.phone, p.profile_photo,
                   adm.full_name AS dentist_name
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            LEFT JOIN admins adm ON a.dentist_id = adm.id
            WHERE a.appointment_date >= $1 AND a.appointment_date < $2
            ORDER BY a.appointment_date
        `, [start, end]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/appointments/booked-times?start=ISO&end=ISO&exclude_id=optional
router.get('/booked-times', verifyToken, async (req, res) => {
    const { start, end, exclude_id } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end are required' });
    try {
        const params = [start, end];
        let excludeClause = '';
        if (exclude_id) { params.push(exclude_id); excludeClause = `AND id != $${params.length}`; }
        const result = await pool.query(`
            SELECT appointment_date, duration_minutes
            FROM appointments
            WHERE appointment_date >= $1 AND appointment_date <= $2
              AND status != 'cancelled'
              ${excludeClause}
            ORDER BY appointment_date
        `, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/appointments
router.post('/', verifyToken, async (req, res) => {
    const { patient_id, dentist_id, appointment_date, duration_minutes, appointment_type, notes } = req.body;
    if (!patient_id) return res.status(400).json({ error: 'Patient is required' });
    if (!appointment_date) return res.status(400).json({ error: 'Appointment date is required' });
    try {
        const dur = duration_minutes || 60;
        const conflict = await pool.query(`
            SELECT id FROM appointments
            WHERE status != 'cancelled'
              AND appointment_date < ($1::timestamptz + ($2 || ' minutes')::interval)
              AND (appointment_date + (duration_minutes || ' minutes')::interval) > $1::timestamptz
            LIMIT 1
        `, [appointment_date, dur]);
        if (conflict.rows.length > 0)
            return res.status(409).json({ error: 'This time slot is already booked. Please choose a different time.' });

        const result = await pool.query(`
            INSERT INTO appointments
              (patient_id, dentist_id, appointment_date, duration_minutes, appointment_type, notes, created_by)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            RETURNING *
        `, [
            patient_id,
            dentist_id || req.admin.id,
            appointment_date,
            dur,
            appointment_type || 'checkup',
            notes || null,
            req.admin.id,
        ]);

        const full = await pool.query(`
            SELECT a.*,
                   p.first_name, p.last_name, p.phone, p.profile_photo,
                   adm.full_name AS dentist_name
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            LEFT JOIN admins adm ON a.dentist_id = adm.id
            WHERE a.id = $1
        `, [result.rows[0].id]);

        res.status(201).json(full.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/appointments/:id
router.put('/:id', verifyToken, async (req, res) => {
    const { patient_id, dentist_id, appointment_date, duration_minutes, appointment_type, status, notes } = req.body;
    if (!patient_id) return res.status(400).json({ error: 'Patient is required' });
    if (!appointment_date) return res.status(400).json({ error: 'Appointment date is required' });
    try {
        const dur = duration_minutes || 60;
        const conflict = await pool.query(`
            SELECT id FROM appointments
            WHERE status != 'cancelled'
              AND id != $3
              AND appointment_date < ($1::timestamptz + ($2 || ' minutes')::interval)
              AND (appointment_date + (duration_minutes || ' minutes')::interval) > $1::timestamptz
            LIMIT 1
        `, [appointment_date, dur, req.params.id]);
        if (conflict.rows.length > 0)
            return res.status(409).json({ error: 'This time slot is already booked. Please choose a different time.' });

        const result = await pool.query(`
            UPDATE appointments SET
              patient_id=$1, dentist_id=$2, appointment_date=$3,
              duration_minutes=$4, appointment_type=$5, status=$6, notes=$7
            WHERE id=$8
            RETURNING *
        `, [
            patient_id,
            dentist_id,
            appointment_date,
            dur,
            appointment_type || 'checkup',
            status || 'scheduled',
            notes || null,
            req.params.id,
        ]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Appointment not found' });

        const full = await pool.query(`
            SELECT a.*,
                   p.first_name, p.last_name, p.phone, p.profile_photo,
                   adm.full_name AS dentist_name
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            LEFT JOIN admins adm ON a.dentist_id = adm.id
            WHERE a.id = $1
        `, [result.rows[0].id]);

        res.json(full.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/appointments/:id
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM appointments WHERE id=$1 RETURNING id',
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Appointment not found' });
        res.json({ message: 'Appointment deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
