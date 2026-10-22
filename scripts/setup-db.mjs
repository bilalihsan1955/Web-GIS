// scripts/setup-db.mjs
// Automated DB Migration & Seeding for Standalone PostgreSQL
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';

// Load .env
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  'postgresql://postgres:postgres@localhost:5432/webgis';

console.log(`[DB Setup] Connecting to: ${connectionString.replace(/:[^:@]+@/, ':****@')}`);

const client = new pg.Client({
  connectionString,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function run() {
  try {
    await client.connect();
    console.log('[DB Setup] Database connection established successfully.');

    // 1. Run Migration
    const migrationPath = resolve(rootDir, 'database', 'migrations', '001_initial_standalone.sql');
    console.log(`[DB Setup] Reading migration from: ${migrationPath}`);
    const migrationSql = readFileSync(migrationPath, 'utf8');
    
    console.log('[DB Setup] Executing schema migration...');
    await client.query(migrationSql);
    console.log('[DB Setup] Schema migration executed successfully.');

    // 2. Run Seeder
    const seedPath = resolve(rootDir, 'database', 'seed.sql');
    console.log(`[DB Setup] Reading seeder from: ${seedPath}`);
    const seedSql = readFileSync(seedPath, 'utf8');

    console.log('[DB Setup] Executing idempotent seeder...');
    await client.query(seedSql);
    console.log('[DB Setup] Seeder executed successfully.');

    // 3. Verify Table Counts
    console.log('\n--- Database Verification Summary ---');
    const tables = ['users', 'user_roles', 'company_sections', 'locations', 'spatial_nodes', 'company_boundaries'];
    for (const table of tables) {
      const res = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`- ${table}: ${res.rows[0].count} records`);
    }

    // List seeded users
    const usersRes = await client.query(`
      SELECT u.id, u.email, ur.role, ur.company_name, ur.company_slug 
      FROM users u 
      LEFT JOIN user_roles ur ON u.id = ur.user_id
    `);
    console.log('\n--- Seeded User Accounts ---');
    console.table(usersRes.rows);

    console.log('[DB Setup] All setup steps completed successfully!');
  } catch (error) {
    console.error('[DB Setup Failed]:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
