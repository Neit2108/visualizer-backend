// ==========================================
// Migration Runner
// Executes migration scripts against the database
// ==========================================

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigrations(): Promise<void> {
  // Create connection to MySQL (without specifying a database initially)
  const connection = await mysql.createConnection({
    host: process.env['MYSQL_HOST'] ?? 'localhost',
    port: parseInt(process.env['MYSQL_PORT'] ?? '3306', 10),
    user: process.env['MYSQL_USER'] ?? 'root',
    password: process.env['MYSQL_PASSWORD'] ?? '',
  });

  try {
    // Create the main database if it doesn't exist
    const database = process.env['MYSQL_DATABASE'] ?? 'sql_visualization';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
    console.log(`✓ Database '${database}' created or already exists`);

    // Switch to the target database
    await connection.query(`USE \`${database}\``);
    console.log(`✓ Connected to database '${database}'`);

    // Get all migration files
    const migrationsDir = __dirname;
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('ℹ No migration files found');
      return;
    }

    // Execute each migration
    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      console.log(`\n📝 Running migration: ${file}`);

      // Split SQL by semicolons and execute non-empty statements
      const statements = sql
        .split(';')
        .map((stmt) => stmt.trim())
        .filter((stmt) => stmt.length > 0);

      for (const statement of statements) {
        try {
          await connection.query(statement);
        } catch (error) {
          console.error(`✗ Error executing statement in ${file}:`);
          console.error(statement);
          throw error;
        }
      }

      console.log(`✓ Migration ${file} completed`);
    }

    console.log('\n✅ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

void runMigrations();
