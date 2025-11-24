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
  connect_timeout: 10, // 10 seconds connection timeout
  idle_timeout: 30, // 30 seconds idle timeout
  max: 20, // Maximum number of connections
  keep_alive: 1, // Keep alive in seconds
});

sql`SELECT 1`
  .then(() => {
    console.log("✓ Connected to Supabase PostgreSQL");
  })
  .catch((err) => {
    console.error("✗ DB connection error:", err.message);
  });

export default sql;

