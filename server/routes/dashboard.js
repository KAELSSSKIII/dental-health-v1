const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { verifyToken } = require('../middleware/auth');

// GET /api/dashboard/stats
router.get('/stats', verifyToken, async (req, res) => {
    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const [
            totalPatientsRes,
            visitsTodayRes,
            upcomingRes,
            monthlyRevenueRes,
            recentPatientsRes,
            todaysScheduleRes,
        ] = await Promise.all([
            pool.query("SELECT COUNT(*) FROM patients WHERE is_active = true"),
            pool.query("SELECT COUNT(*) FROM visits WHERE visit_date >= $1 AND visit_date < $2",
                [todayStart.toISOString(), new Date(todayStart.getTime() + 86400000).toISOString()]),
            pool.query("SELECT COUNT(*) FROM visits WHERE next_appointment >= CURRENT_DATE AND next_appointment < CURRENT_DATE + INTERVAL '30 days'"),
            pool.query("SELECT COALESCE(SUM(cost), 0) AS total FROM visits WHERE visit_date >= $1 AND payment_status != 'pending'",
                [monthStart.toISOString()]),
            pool.query(`
        SELECT p.id, p.last_name, p.first_name, p.date_of_birth, p.sex,
          (SELECT MAX(v.visit_date) FROM visits v WHERE v.patient_id = p.id) AS last_visit,
          (SELECT COUNT(*) FROM dental_chart dc WHERE dc.patient_id = p.id AND dc.status != 'healthy') AS dental_issues
        FROM patients p WHERE p.is_active = true
        ORDER BY p.created_at DESC LIMIT 5
      `),
            pool.query(`
        SELECT v.id, v.visit_date, v.visit_type, v.next_appointment,
          p.first_name, p.last_name, p.id AS patient_id
        FROM visits v
        JOIN patients p ON v.patient_id = p.id
        WHERE v.next_appointment = CURRENT_DATE OR
          (v.visit_date >= $1 AND v.visit_date < $2)
        ORDER BY v.visit_date
        LIMIT 10
      `, [todayStart.toISOString(), new Date(todayStart.getTime() + 86400000).toISOString()]),
        ]);

        res.json({
            totalPatients: parseInt(totalPatientsRes.rows[0].count),
            visitsToday: parseInt(visitsTodayRes.rows[0].count),
            upcomingAppointments: parseInt(upcomingRes.rows[0].count),
            monthlyRevenue: parseFloat(monthlyRevenueRes.rows[0].total),
            recentPatients: recentPatientsRes.rows,
            todaysSchedule: todaysScheduleRes.rows,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
