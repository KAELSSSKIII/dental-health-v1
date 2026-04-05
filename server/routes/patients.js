const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken } = require('../middleware/auth');

// GET /api/patients - paginated + search
router.get('/', verifyToken, async (req, res) => {
    try {
        const {
            search = '',
            page = 1,
            limit = 15,
            sort = 'last_name',
            order = 'asc',
        } = req.query;

        const allowedSorts = ['last_name', 'first_name', 'date_of_birth', 'created_at', 'phone'];
        const sortCol = allowedSorts.includes(sort) ? sort : 'last_name';
        const sortOrder = order === 'desc' ? 'DESC' : 'ASC';
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const searchQuery = `%${search}%`;

        const countRes = await pool.query(`
      SELECT COUNT(*) FROM patients
      WHERE is_active = true
        AND (
          last_name ILIKE $1 OR first_name ILIKE $1
          OR CONCAT(last_name, ' ', first_name) ILIKE $1
          OR CONCAT(first_name, ' ', last_name) ILIKE $1
          OR phone ILIKE $1 OR email ILIKE $1
        )
    `, [searchQuery]);

        const patientsRes = await pool.query(`
      SELECT
        p.id, p.last_name, p.first_name, p.middle_name, p.date_of_birth, p.sex,
        p.phone, p.email, p.address, p.record_date, p.created_at,
        (
          SELECT COUNT(*) FROM dental_chart dc
          WHERE dc.patient_id = p.id AND dc.status != 'healthy'
        ) AS dental_issues,
        (
          SELECT MAX(v.visit_date) FROM visits v WHERE v.patient_id = p.id
        ) AS last_visit
      FROM patients p
      WHERE p.is_active = true
        AND (
          p.last_name ILIKE $1 OR p.first_name ILIKE $1
          OR CONCAT(p.last_name, ' ', p.first_name) ILIKE $1
          OR CONCAT(p.first_name, ' ', p.last_name) ILIKE $1
          OR p.phone ILIKE $1 OR p.email ILIKE $1
        )
      ORDER BY p.${sortCol} ${sortOrder}
      LIMIT $2 OFFSET $3
    `, [searchQuery, parseInt(limit), offset]);

        res.json({
            patients: patientsRes.rows,
            total: parseInt(countRes.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(parseInt(countRes.rows[0].count) / parseInt(limit)),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/patients/:id - single patient
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT p.*,
        a.full_name AS created_by_name,
        (SELECT COUNT(*) FROM dental_chart dc WHERE dc.patient_id = p.id AND dc.status != 'healthy') AS dental_issues,
        (SELECT COUNT(*) FROM visits v WHERE v.patient_id = p.id) AS total_visits,
        (SELECT MAX(v.visit_date) FROM visits v WHERE v.patient_id = p.id) AS last_visit
       FROM patients p
       LEFT JOIN admins a ON p.created_by = a.id
       WHERE p.id = $1 AND p.is_active = true`,
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/patients/intake - public, no auth required
router.post('/intake', [
    body('last_name').trim().notEmpty().withMessage('Last name is required'),
    body('first_name').trim().notEmpty().withMessage('First name is required'),
    body('date_of_birth').isDate().withMessage('Valid date of birth is required'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const {
        last_name, first_name, middle_name, date_of_birth, sex, height, weight,
        occupation, marital_status, spouse_name, address, zip_code, phone,
        business_address, business_phone, email, referred_by, preferred_appointment_time,
        insurance_provider, insurance_id, notes, record_date,
    } = req.body;

    try {
        const result = await pool.query(`
      INSERT INTO patients (
        last_name, first_name, middle_name, date_of_birth, sex, height, weight,
        occupation, marital_status, spouse_name, address, zip_code, phone,
        business_address, business_phone, email, referred_by, preferred_appointment_time,
        insurance_provider, insurance_id, notes, record_date, created_by
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,NULL
      ) RETURNING *
    `, [
            last_name, first_name, middle_name || null, date_of_birth, sex || null, height || null, weight || null,
            occupation || null, marital_status || null, spouse_name || null, address || null, zip_code || null, phone || null,
            business_address || null, business_phone || null, email || null, referred_by || null, preferred_appointment_time || null,
            insurance_provider || null, insurance_id || null, notes || null, record_date || null,
        ]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/patients - create
router.post('/', verifyToken, [
    body('last_name').trim().notEmpty().withMessage('Last name is required'),
    body('first_name').trim().notEmpty().withMessage('First name is required'),
    body('date_of_birth').isDate().withMessage('Valid date of birth is required'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const {
        last_name, first_name, middle_name, date_of_birth, sex, height, weight,
        occupation, marital_status, spouse_name, address, zip_code, phone,
        business_address, business_phone, email, referred_by, preferred_appointment_time,
        insurance_provider, insurance_id, notes, record_date,
    } = req.body;

    try {
        const result = await pool.query(`
      INSERT INTO patients (
        last_name, first_name, middle_name, date_of_birth, sex, height, weight,
        occupation, marital_status, spouse_name, address, zip_code, phone,
        business_address, business_phone, email, referred_by, preferred_appointment_time,
        insurance_provider, insurance_id, notes, record_date, created_by
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23
      ) RETURNING *
    `, [
            last_name, first_name, middle_name || null, date_of_birth, sex || null, height || null, weight || null,
            occupation || null, marital_status || null, spouse_name || null, address || null, zip_code || null, phone || null,
            business_address || null, business_phone || null, email || null, referred_by || null, preferred_appointment_time || null,
            insurance_provider || null, insurance_id || null, notes || null, record_date || null, req.admin.id,
        ]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/patients/:id - update
router.put('/:id', verifyToken, async (req, res) => {
    const {
        last_name, first_name, middle_name, date_of_birth, sex, height, weight,
        occupation, marital_status, spouse_name, address, zip_code, phone,
        business_address, business_phone, email, referred_by, preferred_appointment_time,
        insurance_provider, insurance_id, notes, record_date,
    } = req.body;

    try {
        const result = await pool.query(`
      UPDATE patients SET
        last_name=$1, first_name=$2, middle_name=$3, date_of_birth=$4, sex=$5,
        height=$6, weight=$7, occupation=$8, marital_status=$9, spouse_name=$10,
        address=$11, zip_code=$12, phone=$13, business_address=$14, business_phone=$15,
        email=$16, referred_by=$17, preferred_appointment_time=$18, insurance_provider=$19,
        insurance_id=$20, notes=$21, record_date=$22, updated_at=NOW()
      WHERE id=$23 AND is_active=true
      RETURNING *
    `, [
            last_name, first_name, middle_name || null, date_of_birth, sex || null,
            height || null, weight || null, occupation || null, marital_status || null, spouse_name || null,
            address || null, zip_code || null, phone || null, business_address || null, business_phone || null,
            email || null, referred_by || null, preferred_appointment_time || null, insurance_provider || null,
            insurance_id || null, notes || null, record_date || null, req.params.id,
        ]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/patients/:id - soft delete
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            'UPDATE patients SET is_active=false, updated_at=NOW() WHERE id=$1 AND is_active=true RETURNING id',
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
        res.json({ message: 'Patient deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
