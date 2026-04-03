
import { db } from './src/db';
import * as schema from './src/db/schema';
import { sql } from 'drizzle-orm';

async function main() {
    try {
        console.log("--- DatasheetPoint Table Columns ---");
        const result = await db.execute(sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'DatasheetPoint';
        `);
        console.log(result.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

main();
