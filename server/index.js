require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const app = express();

// ─── Middleware ───────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
const allowedOrigins = [
    'http://localhost:5173',
    process.env.CLIENT_URL,
].filter(Boolean).map(o => o.replace(/\/$/, ''));

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ──────────────────────────────────────
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const dentalChartRoutes = require('./routes/dentalChart');
const visitsRoutes = require('./routes/visits');
const medicalHistoryRoutes = require('./routes/medicalHistory');
const dashboardRoutes = require('./routes/dashboard');
const orthodonticsRoutes = require('./routes/orthodontics');
const settingsRoutes = require('./routes/settings');

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/patients/:id/dental-chart', dentalChartRoutes);
app.use('/api/patients/:id/visits', visitsRoutes);
app.use('/api/patients/:id/medical-history', medicalHistoryRoutes);
app.use('/api/patients/:id/orthodontics', orthodonticsRoutes);
// Standalone visit update/delete
const visitsRouter = require('./routes/visits');
app.use('/api/visits', visitsRouter);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);

// ─── Health check ─────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

// ─── Global error handler ─────────────────────────
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

// ─── Start ────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🦷 Dental Clinic API running on http://localhost:${PORT}`);
});
