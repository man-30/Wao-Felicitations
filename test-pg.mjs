import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '.env.production') });

const url = process.env.DATABASE_URL;
console.log(`Testing connection to: ${url?.split('@')[1]}`);

const client = new pg.Client({
  connectionString: url,
  ssl: {
    rejectUnauthorized: false
  }
});

async function test() {
  try {
    await client.connect();
    console.log('✅ Connected successfully!');
    const res = await client.query('SELECT NOW()');
    console.log('Query result:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }
}

test();
