const { Pool } = require('pg');

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function isRailway() {
    return Boolean(
        process.env.RAILWAY_ENVIRONMENT ||
        process.env.RAILWAY_SERVICE_NAME ||
        process.env.RAILWAY_PROJECT_ID
    );
}

function isLocalHost(host) {
    return !host || LOCAL_HOSTS.has(host);
}

function readBoolean(value) {
    if (value === undefined || value === null || value === '') return undefined;
    const normalized = String(value).toLowerCase();
    if (['1', 'true', 'yes', 'require'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'disable'].includes(normalized)) return false;
    return undefined;
}

function getSslConfig(host) {
    const sslMode = (process.env.PGSSLMODE || '').toLowerCase();
    const dbSsl = readBoolean(process.env.DB_SSL);

    if (sslMode === 'disable' || dbSsl === false) return false;
    if (sslMode === 'require' || sslMode === 'no-verify' || dbSsl === true) {
        return { rejectUnauthorized: false };
    }
    if (sslMode === 'verify-full') return true;

    if (isRailway() || String(host || '').endsWith('.railway.internal')) {
        return false;
    }

    if (process.env.NODE_ENV === 'production' && !isLocalHost(host)) {
        return { rejectUnauthorized: false };
    }

    return false;
}

function getHostConfig() {
    const host = process.env.PGHOST || process.env.POSTGRES_HOST || process.env.DB_HOST || 'localhost';

    return {
        host,
        port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5432', 10),
        database: process.env.PGDATABASE || process.env.POSTGRES_DB || process.env.DB_NAME || 'dental_clinic',
        user: process.env.PGUSER || process.env.POSTGRES_USER || process.env.DB_USER || 'postgres',
        password: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || 'postgres',
        ssl: getSslConfig(host),
    };
}

function hasExplicitDatabaseConfig() {
    return Boolean(
        process.env.DATABASE_URL ||
        process.env.PGHOST ||
        process.env.DB_HOST ||
        process.env.POSTGRES_HOST
    );
}

function getPoolConfig() {
    if (!hasExplicitDatabaseConfig() && process.env.NODE_ENV === 'production') {
        throw new Error(
            'Missing production database configuration. Attach a Railway Postgres service and expose DATABASE_URL, or set PGHOST/PGUSER/PGPASSWORD/PGDATABASE.'
        );
    }

    if (process.env.DATABASE_URL) {
        const url = new URL(process.env.DATABASE_URL);

        return {
            connectionString: process.env.DATABASE_URL,
            ssl: getSslConfig(url.hostname),
        };
    }

    return getHostConfig();
}

function createPool(extraConfig = {}) {
    return new Pool({
        ...getPoolConfig(),
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        ...extraConfig,
    });
}

function describeDatabaseTarget() {
    if (process.env.DATABASE_URL) {
        try {
            const url = new URL(process.env.DATABASE_URL);
            return `${url.hostname}:${url.port || 5432}/${url.pathname.replace(/^\//, '')}`;
        } catch {
            return 'DATABASE_URL';
        }
    }

    const config = getHostConfig();
    return `${config.host}:${config.port}/${config.database}`;
}

module.exports = {
    createPool,
    describeDatabaseTarget,
};
