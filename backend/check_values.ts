
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const res = await pool.query(`SELECT * FROM "CompanyProfile" LIMIT 1`);
    if (res.rows.length > 0) {
        console.log('Sample Company Record (keys):');
        Object.keys(res.rows[0]).forEach(key => {
            console.log(`- ${key}: ${res.rows[0][key]}`);
        });
    } else {
        console.log('No companies found.');
    }
    await pool.end();
}
check();
