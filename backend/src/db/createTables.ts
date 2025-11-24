import sql from "./db";
import { addColumnsToTable } from "./utils/updateTable";

interface TableDefinition {
  name: string;
  createSQL: string;
  columns: Array<{
    name: string;
    type: string;
    nullable?: boolean;
    defaultValue?: string;
  }>;
}

async function tableExists(tableName: string): Promise<boolean> {
  try {
    const result = await sql.unsafe(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = '${tableName}'
      ) as exists;
    `);
    return result[0]?.exists || false;
  } catch (error: any) {
    console.error(`  ⚠ Error checking table "${tableName}":`, error.message);
    return false;
  }
}

async function createAllTables() {
  try {
    console.log("Checking database connection...");
    
    try {
      await sql`SELECT 1`;
      console.log("✓ Database connection established\n");
    } catch (connError: any) {
      console.error("✗ Failed to connect to database:", connError.message);
      console.error("\nPlease check:");
      console.error("  1. DATABASE_URL is set in .env file");
      console.error("  2. Database server is accessible");
      console.error("  3. Network connection is stable");
      process.exit(1);
    }

    console.log("Checking and creating database tables...\n");

    await sql`CREATE EXTENSION IF NOT EXISTS vector`;

    const tables: TableDefinition[] = [
      {
        name: "Users",
        createSQL: `
          CREATE TABLE "Users" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "email" text NOT NULL,
            "password_hash" text NOT NULL,
            "role" text DEFAULT 'user' NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL,
            CONSTRAINT "Users_email_unique" UNIQUE("email")
          );
        `,
        columns: [
          { name: "id", type: "uuid" },
          { name: "email", type: "text" },
          { name: "password_hash", type: "text" },
          { name: "role", type: "text" },
          { name: "name", type: "text", nullable: true },
          { name: "created_at", type: "timestamp" },
          { name: "updated_at", type: "timestamp" },
        ],
      },
      {
        name: "Courses",
        createSQL: `
          CREATE TABLE "Courses" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "title" text NOT NULL,
            "description" text,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
          );
        `,
        columns: [
          { name: "id", type: "uuid" },
          { name: "title", type: "text" },
          { name: "description", type: "text", nullable: true },
          { name: "created_at", type: "timestamp" },
          { name: "updated_at", type: "timestamp" },
        ],
      },
      {
        name: "Modules",
        createSQL: `
          CREATE TABLE "Modules" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "course_id" uuid NOT NULL REFERENCES "Courses"("id") ON DELETE CASCADE,
            "title" text NOT NULL,
            "order" integer DEFAULT 0 NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
          );
        `,
        columns: [
          { name: "id", type: "uuid" },
          { name: "course_id", type: "uuid" },
          { name: "title", type: "text" },
          { name: "order", type: "integer" },
          { name: "created_at", type: "timestamp" },
          { name: "updated_at", type: "timestamp" },
        ],
      },
      {
        name: "Lessons",
        createSQL: `
          CREATE TABLE "Lessons" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "module_id" uuid NOT NULL REFERENCES "Modules"("id") ON DELETE CASCADE,
            "title" text NOT NULL,
            "content" text NOT NULL,
            "order" integer DEFAULT 0 NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
          );
        `,
        columns: [
          { name: "id", type: "uuid" },
          { name: "module_id", type: "uuid" },
          { name: "title", type: "text" },
          { name: "content", type: "text" },
          { name: "order", type: "integer" },
          { name: "created_at", type: "timestamp" },
          { name: "updated_at", type: "timestamp" },
        ],
      },
      {
        name: "LessonChunks",
        createSQL: `
          CREATE TABLE "LessonChunks" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "lesson_id" uuid NOT NULL REFERENCES "Lessons"("id") ON DELETE CASCADE,
            "content" text NOT NULL,
            "embedding" vector(384),
            "chunk_index" integer DEFAULT 0 NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL
          );
        `,
        columns: [
          { name: "id", type: "uuid" },
          { name: "lesson_id", type: "uuid" },
          { name: "content", type: "text" },
          { name: "embedding", type: "vector(384)", nullable: true },
          { name: "chunk_index", type: "integer" },
          { name: "created_at", type: "timestamp" },
        ],
      },
      {
        name: "Enrollments",
        createSQL: `
          CREATE TABLE "Enrollments" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "user_id" uuid NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
            "course_id" uuid NOT NULL REFERENCES "Courses"("id") ON DELETE CASCADE,
            "enrolled_by" uuid REFERENCES "Users"("id"),
            "enrolled_at" timestamp DEFAULT now() NOT NULL,
            UNIQUE("user_id", "course_id")
          );
        `,
        columns: [
          { name: "id", type: "uuid" },
          { name: "user_id", type: "uuid" },
          { name: "course_id", type: "uuid" },
          { name: "enrolled_by", type: "uuid", nullable: true },
          { name: "status", type: "text", nullable: true },
          { name: "read", type: "integer", nullable: false, defaultValue: "0" },
          { name: "enrolled_at", type: "timestamp" },
        ],
      },
      {
        name: "Notifications",
        createSQL: `
          CREATE TABLE "Notifications" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "user_id" uuid NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
            "type" text NOT NULL,
            "title" text NOT NULL,
            "message" text NOT NULL,
            "related_id" uuid,
            "read" integer DEFAULT 0 NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL
          );
        `,
        columns: [
          { name: "id", type: "uuid" },
          { name: "user_id", type: "uuid" },
          { name: "type", type: "text" },
          { name: "title", type: "text" },
          { name: "message", type: "text" },
          { name: "related_id", type: "uuid", nullable: true },
          { name: "read", type: "integer", nullable: false, defaultValue: "0" },
          { name: "created_at", type: "timestamp" },
        ],
      },
    ];

    for (const table of tables) {
      try {
        const exists = await tableExists(table.name);
        if (exists) {
          console.log(`  ⏭  Table "${table.name}" already exists. Skipping creation.`);
        } else {
          await sql.unsafe(table.createSQL);
          console.log(`  ✓ Created table "${table.name}"`);
        }
      } catch (error: any) {
        console.error(`  ✗ Failed to create table "${table.name}":`, error.message);
        throw error;
      }
    }

    await sql`CREATE INDEX IF NOT EXISTS "LessonChunks_embedding_idx" ON "LessonChunks" USING hnsw ("embedding" vector_cosine_ops);`;

    console.log("\n✓ All tables verified/created!");

    console.log("\nUpdating tables with missing columns...\n");

    for (const table of tables) {
      try {
        const exists = await tableExists(table.name);
        if (exists) {
          const columnsToAdd = [];
          for (const column of table.columns) {
            try {
              const columnExists = await sql.unsafe(`
                SELECT EXISTS (
                  SELECT 1 FROM information_schema.columns 
                  WHERE table_name = '${table.name}' AND column_name = '${column.name}'
                ) as exists;
              `);

              if (!columnExists[0]?.exists) {
                columnsToAdd.push(column);
              }
            } catch (colError: any) {
              console.error(`  ⚠ Error checking column "${column.name}" in "${table.name}":`, colError.message);
            }
          }

          if (columnsToAdd.length > 0) {
            await addColumnsToTable({
              tableName: table.name,
              columns: columnsToAdd,
            });
          } else {
            console.log(`  ✓ Table "${table.name}" has all required columns.`);
          }
        }
      } catch (error: any) {
        console.error(`  ✗ Failed to update table "${table.name}":`, error.message);
        throw error;
      }
    }

    console.log("\n✓ All tables updated successfully!");
    process.exit(0);
  } catch (error: any) {
    console.error("\n✗ Failed to create/update tables:", error.message);
    if (error.code) {
      console.error(`  Error code: ${error.code}`);
    }
    if (error.errno) {
      console.error(`  Error number: ${error.errno}`);
    }
    if (error.syscall) {
      console.error(`  System call: ${error.syscall}`);
    }
    
    console.error("\nTroubleshooting tips:");
    console.error("  1. Verify DATABASE_URL in .env file is correct");
    console.error("  2. Check if database server is accessible");
    console.error("  3. Verify network connection");
    console.error("  4. Check if SSL settings are correct for your database");
    
    process.exit(1);
  }
}

createAllTables();
