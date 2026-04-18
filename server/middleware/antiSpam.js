'use strict';
const rateLimit = require('express-rate-limit');

// Rate limiter: 5 submissions per IP per 15 minutes
const publicFormLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many submissions. Please wait 15 minutes and try again.' },
});

// In-memory cooldown: same identity blocked for 60 minutes after a successful submission
const recentSubmissions = new Map();
const COOLDOWN_MS = 60 * 60 * 1000;

// Prune stale entries every 10 minutes to prevent memory growth
setInterval(() => {
    const now = Date.now();
    for (const [key, ts] of recentSubmissions) {
        if (now - ts > COOLDOWN_MS) recentSubmissions.delete(key);
    }
}, 10 * 60 * 1000);

// Reject if the hidden fax field is filled — bots do this, humans never see it
function checkHoneypot(req, res, next) {
    if (req.body.fax && req.body.fax.trim() !== '') {
        return res.status(400).json({ ok: true }); // silent fake-success to confuse bots
    }
    next();
}

// Reject if form was submitted in under 4 seconds — bots submit instantly
function checkTiming(req, res, next) {
    const elapsed = parseInt(req.body._t, 10);
    if (!elapsed || isNaN(elapsed) || elapsed < 4000) {
        return res.status(400).json({ ok: true }); // silent fake-success
    }
    next();
}

// Block the same name+DOB+IP from resubmitting within 60 minutes
function checkDuplicateCooldown(req, res, next) {
    const ip = req.ip || 'unknown';
    const key = [
        ip,
        (req.body.last_name || '').toLowerCase().trim(),
        (req.body.first_name || '').toLowerCase().trim(),
        req.body.date_of_birth || '',
    ].join('|');

    const lastSeen = recentSubmissions.get(key);
    if (lastSeen && Date.now() - lastSeen < COOLDOWN_MS) {
        const remainingMin = Math.ceil((COOLDOWN_MS - (Date.now() - lastSeen)) / 60000);
        return res.status(429).json({
            error: `You already submitted recently. Please wait ${remainingMin} more minute(s) before trying again.`,
        });
    }
    // Route handlers call this after a confirmed successful DB write
    res.locals.recordSpamKey = () => recentSubmissions.set(key, Date.now());
    next();
}

module.exports = { publicFormLimiter, checkHoneypot, checkTiming, checkDuplicateCooldown };
