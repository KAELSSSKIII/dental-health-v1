require('dotenv').config();
const { createPool } = require('./config');

const pool = createPool();

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

module.exports = pool;
