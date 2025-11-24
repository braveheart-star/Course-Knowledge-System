import sql from "../db";

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable?: boolean;
  defaultValue?: string;
}

export interface TableUpdateOptions {
  tableName: string;
  columns: ColumnDefinition[];
  ifNotExists?: boolean;
}

export async function addColumnsToTable(options: TableUpdateOptions): Promise<void> {
  const { tableName, columns, ifNotExists = true } = options;

  try {
    console.log(`Updating table "${tableName}" with ${columns.length} column(s)...`);

    for (const column of columns) {
      const nullable = column.nullable !== false ? "" : " NOT NULL";
      const defaultValue = column.defaultValue ? ` DEFAULT ${column.defaultValue}` : "";

      if (ifNotExists) {
        const columnExists = await sql.unsafe(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = '${tableName}' AND column_name = '${column.name}'
          ) as exists;
        `);

        if (!columnExists[0].exists) {
          await sql.unsafe(`
            ALTER TABLE "${tableName}" 
            ADD COLUMN "${column.name}" ${column.type}${nullable}${defaultValue};
          `);
          console.log(`  ✓ Added column "${column.name}"`);
        } else {
          console.log(`  - Column "${column.name}" already exists. Skipping.`);
        }
      } else {
        await sql.unsafe(`
          ALTER TABLE "${tableName}" 
          ADD COLUMN "${column.name}" ${column.type}${nullable}${defaultValue};
        `);
        console.log(`  ✓ Added column "${column.name}"`);
      }
    }

    console.log(`✓ Table "${tableName}" updated successfully!`);
  } catch (error: any) {
    console.error(`✗ Failed to update table "${tableName}":`, error.message);
    throw error;
  }
}

export async function removeColumnsFromTable(
  tableName: string,
  columnNames: string[]
): Promise<void> {
  try {
    console.log(`Removing ${columnNames.length} column(s) from table "${tableName}"...`);

    for (const columnName of columnNames) {
      await sql.unsafe(`
        ALTER TABLE "${tableName}" 
        DROP COLUMN IF EXISTS "${columnName}";
      `);

      console.log(`  ✓ Removed column "${columnName}"`);
    }

    console.log(`✓ Columns removed from "${tableName}" successfully!`);
  } catch (error: any) {
    console.error(`✗ Failed to remove columns from "${tableName}":`, error.message);
    throw error;
  }
}

export async function modifyColumnType(
  tableName: string,
  columnName: string,
  newType: string
): Promise<void> {
  try {
    console.log(`Modifying column "${columnName}" type in table "${tableName}"...`);

    await sql.unsafe(`
      ALTER TABLE "${tableName}" 
      ALTER COLUMN "${columnName}" TYPE ${newType};
    `);

    console.log(`✓ Column "${columnName}" type updated successfully!`);
  } catch (error: any) {
    console.error(`✗ Failed to modify column "${columnName}":`, error.message);
    throw error;
  }
}

