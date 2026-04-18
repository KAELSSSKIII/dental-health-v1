const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

async function getKioskRow() {
    await pool.query('ALTER TABLE clinic_settings ADD COLUMN IF NOT EXISTS kiosk_token VARCHAR(64)');
    const result = await pool.query(
        'SELECT kiosk_token, clinic_name FROM clinic_settings LIMIT 1'
    );
    return result.rows[0] || null;
}

// GET /api/kiosk/validate/:token — check token validity, return clinic name
router.get('/validate/:token', async (req, res) => {
    try {
        const row = await getKioskRow();
        if (!row || !row.kiosk_token || row.kiosk_token !== req.params.token) {
            return res.status(404).json({ error: 'Invalid kiosk token' });
        }
        res.json({ ok: true, clinic_name: row.clinic_name || 'Our Clinic' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/kiosk/:token — submit patient registration from clinic iPad
// No anti-spam — the token acts as the access control for the dedicated device
router.post('/:token', async (req, res) => {
    try {
        const row = await getKioskRow();
        if (!row || !row.kiosk_token || row.kiosk_token !== req.params.token) {
            return res.status(403).json({ error: 'Invalid kiosk token' });
        }

        const {
            last_name, first_name, middle_name, date_of_birth, sex, height, weight,
            occupation, marital_status, spouse_name, address, zip_code, phone,
            business_address, business_phone, email, referred_by, preferred_appointment_time,
            insurance_provider, insurance_id, notes, record_date, profile_photo,
        } = req.body;

        if (!last_name?.trim() || !first_name?.trim() || !date_of_birth) {
            return res.status(400).json({ error: 'Last name, first name, and date of birth are required' });
        }

        // Check for existing patient with same name + birthday
        const dupCheck = await pool.query(
            `SELECT id FROM patients
             WHERE LOWER(TRIM(last_name)) = LOWER(TRIM($1))
               AND LOWER(TRIM(first_name)) = LOWER(TRIM($2))
               AND date_of_birth = $3
               AND is_active = true
             LIMIT 1`,
            [last_name, first_name, date_of_birth]
        );

        if (dupCheck.rows.length > 0) {
            const patientId = dupCheck.rows[0].id;
            await pool.query(`
                UPDATE patients SET
                  phone         = CASE WHEN $1  IS NOT NULL THEN $1  ELSE phone         END,
                  email         = CASE WHEN $2  IS NOT NULL THEN $2  ELSE email         END,
                  address       = CASE WHEN $3  IS NOT NULL THEN $3  ELSE address       END,
                  profile_photo = CASE WHEN $4  IS NOT NULL THEN $4  ELSE profile_photo END,
                  updated_at    = NOW()
                WHERE id = $5
            `, [
                phone || null, email || null, address || null,
                (profile_photo && profile_photo.startsWith('data:image/')) ? profile_photo : null,
                patientId,
            ]);
            return res.json({ updated: true, patientName: first_name });
        }

        await pool.query(`
            INSERT INTO patients (
                last_name, first_name, middle_name, date_of_birth, sex, height, weight,
                occupation, marital_status, spouse_name, address, zip_code, phone,
                business_address, business_phone, email, referred_by, preferred_appointment_time,
                insurance_provider, insurance_id, notes, record_date, profile_photo, created_by
            ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,NULL
            )
        `, [
            last_name.trim(), first_name.trim(), middle_name || null, date_of_birth, sex || null,
            height || null, weight || null, occupation || null, marital_status || null, spouse_name || null,
            address || null, zip_code || null, phone || null, business_address || null, business_phone || null,
            email || null, referred_by || null, preferred_appointment_time || null,
            insurance_provider || null, insurance_id || null, notes || null, record_date || null,
            (profile_photo && profile_photo.startsWith('data:image/')) ? profile_photo : null,
        ]);

        res.status(201).json({ updated: false, patientName: first_name });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
