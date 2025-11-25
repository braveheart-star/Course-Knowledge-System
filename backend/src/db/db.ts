import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("ERROR: DATABASE_URL is not set in environment variables!");
  process.exit(1);
}

const sql = postgres(connectionString, {
  ssl: { rejectUnauthorized: false },
  onnotice: () => {},
  connect_timeout: 30,
  idle_timeout: 300,
  max: 20,
  keep_alive: true,
  max_lifetime: 60 * 30,
  transform: {
    undefined: null,
  },
  connection: {
    application_name: 'course-knowledge-system',
  },
});

async function testConnection(retries = 3): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await sql`SELECT 1`;
      console.log("✓ Connected to Supabase PostgreSQL");
      return;
    } catch (err: any) {
      if (i === retries - 1) {
        console.error("✗ DB connection error:", err.message);
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
}

testConnection().catch(() => {
  // Error already logged
});

export default sql;

