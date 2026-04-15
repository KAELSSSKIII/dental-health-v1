const fs   = require('fs');
const path = require('path');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { createPool, describeDatabaseTarget } = require('./config');

const pool = createPool();
const retries = parseInt(process.env.DB_CONNECT_RETRIES || '10', 10);
const retryDelayMs = parseInt(process.env.DB_CONNECT_RETRY_DELAY_MS || '2000', 10);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function connectWithRetry() {
    for (let attempt = 1; attempt <= retries; attempt += 1) {
        try {
            return await pool.connect();
        } catch (err) {
            if (attempt === retries) throw err;
            console.warn(
                `Database unavailable at ${describeDatabaseTarget()} (attempt ${attempt}/${retries}). Retrying in ${retryDelayMs}ms...`
            );
            await sleep(retryDelayMs);
        }
    }
}

async function migrate() {
    let client;
    try {
        client = await connectWithRetry();
        console.log('Running schema migration...');
        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        await client.query(schema);
        console.log('Schema applied successfully.');
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exitCode = 1;
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

migrate();
