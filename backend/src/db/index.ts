export { default as sql } from "./db";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("ERROR: DATABASE_URL is not set in environment variables!");
  process.exit(1);
}

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 300000,
  max: 20,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  statement_timeout: 30000,
  query_timeout: 30000,
});

// Handle connection errors gracefully
// Supabase and other cloud providers terminate idle connections, which is expected behavior
pool.on('error', (err: any) => {
  // Filter out expected connection termination errors
  const isConnectionTerminated = 
    err.message?.includes('Connection terminated') ||
    err.message?.includes('connection terminated unexpectedly') ||
    err.message?.includes('server closed the connection') ||
    err.code === 'ECONNRESET' ||
    err.code === 'EPIPE' ||
    (err.code === '57P01' && err.message?.includes('terminating connection'));
  
  // Only log unexpected errors
  if (!isConnectionTerminated) {
    console.error('Unexpected database pool error:', err.message || err);
  }
  // For connection terminations, the pool will automatically remove the dead connection
  // and create a new one when needed, so we don't need to do anything
});

pool.on('connect', () => {
  // Connection established - pool will handle reconnections automatically
});

pool.on('remove', () => {
  // Connection removed from pool - this is normal when connections are terminated
});

async function testConnection(retries = 3): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('✓ Database connection pool established');
      return;
    } catch (err: any) {
      if (i === retries - 1) {
        console.error('✗ Failed to establish database connection pool:', err.message);
        console.error('Please check your DATABASE_URL and network connectivity');
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
}

testConnection().catch(() => {
  // Error already logged
});

export const db = drizzle(pool, { schema });

