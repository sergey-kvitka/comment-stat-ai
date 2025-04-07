const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
});

/** Function for executing SQL scripts */
const runScripts = async () => {
    const client = await pool.connect();
    try {
        const scriptsDir = path.join(__dirname, './sql');
        const files = fs.readdirSync(scriptsDir)
            .filter(file => file.endsWith('.sql'))
            .sort();

        for (const file of files) {
            const sql = fs.readFileSync(path.join(scriptsDir, file), 'utf8');
            await client.query(sql);
            console.log(`Executed script: ${file}`);
        }
    } catch (error) {
        console.error('Error executing SQL scripts:', error);
        throw error;
    } finally {
        client.release();
    }
};

/** Database init function */
const initializeDB = async () => {
    let client;
    try {
        client = await pool.connect();
        // checking connection
        await client.query('select 1');
        console.log('Database connected');

        // executing scripts
        await runScripts();
    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    } finally {
        if (client) client.release();
    }
};

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
    initializeDB,
};