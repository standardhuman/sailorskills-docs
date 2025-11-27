#!/usr/bin/env node

/**
 * Database Schema Validation Script
 *
 * Compares actual database schema to expected schema
 * Run in CI/CD to catch schema drift
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function getActualSchema() {
  const query = `
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `;

  const result = await pool.query(query);
  return result.rows;
}

async function getIndexes() {
  const query = `
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname
  `;

  const result = await pool.query(query);
  return result.rows;
}

async function validateSchema() {
  console.log('🔍 Validating database schema...\n');

  try {
    // Get actual schema
    const actualSchema = await getActualSchema();
    const actualIndexes = await getIndexes();

    console.log(`✅ Found ${actualSchema.length} columns across ${new Set(actualSchema.map(c => c.table_name)).size} tables`);
    console.log(`✅ Found ${actualIndexes.length} indexes\n`);

    // Load expected schema (if exists)
    const expectedSchemaPath = join(__dirname, '../references/expected-schema.json');
    let expectedSchema;

    try {
      expectedSchema = JSON.parse(readFileSync(expectedSchemaPath, 'utf-8'));
    } catch (error) {
      console.log('⚠️  No expected schema file found. Generating baseline...');
      console.log(`📝 Save this to ${expectedSchemaPath}:\n`);
      console.log(JSON.stringify({ schema: actualSchema, indexes: actualIndexes }, null, 2));
      process.exit(0);
    }

    // Compare schemas
    const differences = [];

    // Check for missing tables/columns
    for (const expected of expectedSchema.schema) {
      const actual = actualSchema.find(
        a => a.table_name === expected.table_name && a.column_name === expected.column_name
      );

      if (!actual) {
        differences.push(`❌ Missing: ${expected.table_name}.${expected.column_name}`);
      } else if (actual.data_type !== expected.data_type) {
        differences.push(
          `⚠️  Type mismatch: ${expected.table_name}.${expected.column_name} (expected ${expected.data_type}, got ${actual.data_type})`
        );
      }
    }

    // Check for unexpected columns
    for (const actual of actualSchema) {
      const expected = expectedSchema.schema.find(
        e => e.table_name === actual.table_name && e.column_name === actual.column_name
      );

      if (!expected) {
        differences.push(`➕ Unexpected: ${actual.table_name}.${actual.column_name}`);
      }
    }

    if (differences.length === 0) {
      console.log('✅ Schema validation passed!\n');
      process.exit(0);
    } else {
      console.log('❌ Schema validation failed:\n');
      differences.forEach(diff => console.log(diff));
      console.log('');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Schema validation error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

validateSchema();
