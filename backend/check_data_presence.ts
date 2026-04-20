
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const res = await pool.query(`
        SELECT name, "ytbsUsername", "ytbsPassword", "ytbsApiKey" 
        FROM "CompanyProfile" 
        WHERE "ytbsUsername" IS NOT NULL OR "ytbsApiKey" IS NOT NULL
    `);
    console.log(`Found ${res.rows.length} companies with YTBS data.`);
    res.rows.forEach(row => {
        console.log(`- Company: ${row.name} | YTBS User: ${row.ytbsUsername}`);
    });
    await pool.end();
}
check();
