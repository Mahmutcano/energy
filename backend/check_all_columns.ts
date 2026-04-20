
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function check() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const res = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'CompanyProfile'
    `);
    console.log('Columns in CompanyProfile:');
    res.rows.forEach(row => console.log(`- ${row.column_name} (${row.data_type})`));
    await pool.end();
}

check();
