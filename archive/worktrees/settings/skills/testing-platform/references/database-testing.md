# Database Testing Reference

Comprehensive guide to schema validation, RLS testing, and migration validation.

## Schema Validation

### Purpose
- Catch schema drift between expected and actual database structure
- Validate migrations applied correctly
- Ensure column types, constraints, and indexes match expectations

### Using the validate-schema.mjs Script

```bash
# Run schema validation
DATABASE_URL="postgresql://..." node scripts/validate-schema.mjs

# On first run, generates baseline schema
# Save output to references/expected-schema.json

# Subsequent runs compare against baseline
# Exits with code 1 if differences found
```

### Expected Schema Format

```json
{
  "schema": [
    {
      "table_name": "customers",
      "column_name": "id",
      "data_type": "uuid",
      "is_nullable": "NO",
      "column_default": "gen_random_uuid()"
    },
    {
      "table_name": "customers",
      "column_name": "email",
      "data_type": "character varying",
      "is_nullable": "NO",
      "column_default": null
    }
  ],
  "indexes": [
    {
      "tablename": "customers",
      "indexname": "customers_pkey",
      "indexdef": "CREATE UNIQUE INDEX customers_pkey ON public.customers USING btree (id)"
    },
    {
      "tablename": "customers",
      "indexname": "idx_customers_email",
      "indexdef": "CREATE INDEX idx_customers_email ON public.customers USING btree (email)"
    }
  ]
}
```

### Custom Schema Validation

```javascript
import { queryDatabase } from './helpers/db-utils.js';

test('critical tables exist', async () => {
  const tables = await queryDatabase(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('customers', 'invoices', 'service_logs')
  `);

  expect(tables).toHaveLength(3);
});

test('required indexes exist', async () => {
  const indexes = await queryDatabase(`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
  `);

  const indexNames = indexes.map(i => i.indexname);

  expect(indexNames).toContain('idx_invoices_customer_id');
  expect(indexNames).toContain('idx_service_logs_customer_id');
  expect(indexNames).toContain('idx_customers_email');
});

test('foreign key constraints exist', async () => {
  const constraints = await queryDatabase(`
    SELECT
      tc.table_name,
      tc.constraint_name,
      tc.constraint_type
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
  `);

  expect(constraints.length).toBeGreaterThan(0);

  // Verify specific foreign key exists
  const invoiceFk = constraints.find(c =>
    c.table_name === 'invoices' &&
    c.constraint_name.includes('customer')
  );

  expect(invoiceFk).toBeDefined();
});
```

## Row-Level Security (RLS) Testing

### Purpose
- Validate multi-tenant data isolation
- Ensure customers cannot see each other's data
- Verify RLS policies are enabled and working

### Using the test-rls-policies.mjs Script

```bash
# Run RLS policy tests
DATABASE_URL="postgresql://..." node scripts/test-rls-policies.mjs

# Checks:
# 1. RLS enabled on critical tables
# 2. Policies exist for SELECT, INSERT, UPDATE, DELETE
# 3. Basic isolation test (creates two customers, verifies separation)
```

### RLS Test Patterns

```javascript
test('RLS enabled on critical tables', async () => {
  const rlsCheck = await queryDatabase(`
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('customers', 'invoices', 'service_logs')
  `);

  for (const table of rlsCheck) {
    expect(table.rowsecurity).toBe(true);
  }
});

test('RLS policies exist', async () => {
  const policies = await queryDatabase(`
    SELECT tablename, policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'invoices'
  `);

  // Should have policies for SELECT, INSERT, UPDATE, DELETE
  expect(policies.length).toBeGreaterThanOrEqual(4);
});

test('customer isolation enforced', async () => {
  // Create two test customers
  const customer1 = await createTestCustomer({ email: 'c1@test.com' });
  const customer2 = await createTestCustomer({ email: 'c2@test.com' });

  // Create invoice for customer 1
  const invoice = await createTestInvoice({
    customer_id: customer1,
    amount: 100
  });

  // Attempt to query as customer 2 (requires setting session context)
  // This example assumes you have a way to set the current user context

  const result = await queryDatabase(
    'SELECT * FROM invoices WHERE id = $1',
    [invoice.id]
  );

  // If RLS working correctly, customer 2 should NOT see customer 1's invoice
  expect(result).toHaveLength(0);
});
```

### Testing RLS with Supabase

```javascript
import { createClient } from '@supabase/supabase-js';

test('customer cannot see other customer invoices', async () => {
  // Create Supabase client for customer 1
  const supabase1 = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  // Sign in as customer 1
  await supabase1.auth.signInWithPassword({
    email: 'customer1@test.com',
    password: 'test-password'
  });

  // Create invoice for customer 1
  const { data: invoice } = await supabase1
    .from('invoices')
    .insert({ amount: 100 })
    .select()
    .single();

  // Create Supabase client for customer 2
  const supabase2 = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  // Sign in as customer 2
  await supabase2.auth.signInWithPassword({
    email: 'customer2@test.com',
    password: 'test-password'
  });

  // Try to fetch customer 1's invoice
  const { data } = await supabase2
    .from('invoices')
    .select()
    .eq('id', invoice.id);

  // Should be empty due to RLS
  expect(data).toHaveLength(0);
});
```

## Migration Testing

### Purpose
- Validate migration syntax before applying to production
- Test rollback scripts work correctly
- Ensure data integrity maintained during migration

### Using the apply-migration-dry-run.mjs Script

```bash
# Test migration without committing
DATABASE_URL="postgresql://..." node scripts/apply-migration-dry-run.mjs supabase/migrations/20251029_add_orders_table.sql

# Applies migration in transaction, then rolls back
# Validates syntax and catches errors before production deployment
```

### Migration Test Pattern

```javascript
test('migration applies cleanly', async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Read migration file
    const migrationSQL = readFileSync('supabase/migrations/20251029_add_orders_table.sql', 'utf-8');

    // Apply migration
    await client.query(migrationSQL);

    // Verify table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'pending_orders'
      )
    `);

    expect(tableCheck.rows[0].exists).toBe(true);

    // Verify columns correct
    const columns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'pending_orders'
      ORDER BY ordinal_position
    `);

    expect(columns.rows).toContainEqual({ column_name: 'id', data_type: 'uuid' });
    expect(columns.rows).toContainEqual({ column_name: 'customer_id', data_type: 'uuid' });

    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
});

test('rollback script works', async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Apply migration
    const migrationSQL = readFileSync('supabase/migrations/20251029_add_orders_table.sql', 'utf-8');
    await client.query(migrationSQL);

    // Apply rollback
    const rollbackSQL = readFileSync('supabase/migrations/20251029_add_orders_table_rollback.sql', 'utf-8');
    await client.query(rollbackSQL);

    // Verify table removed
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'pending_orders'
      )
    `);

    expect(tableCheck.rows[0].exists).toBe(false);

    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
});
```

### Data Integrity Testing

```javascript
test('migration preserves existing data', async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Insert test data
    await client.query(`
      INSERT INTO customers (id, email, name)
      VALUES ('550e8400-e29b-41d4-a716-446655440000', 'test@example.com', 'Test Customer')
    `);

    // Apply migration that adds new column
    const migrationSQL = readFileSync('supabase/migrations/20251029_add_phone_column.sql', 'utf-8');
    await client.query(migrationSQL);

    // Verify original data intact
    const customer = await client.query(`
      SELECT * FROM customers WHERE id = '550e8400-e29b-41d4-a716-446655440000'
    `);

    expect(customer.rows[0].email).toBe('test@example.com');
    expect(customer.rows[0].name).toBe('Test Customer');
    expect(customer.rows[0].phone).toBeNull(); // New column

    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
});
```

## Test Database Setup

### Option 1: Dedicated Test Database (Recommended)

```bash
# Create separate Supabase project for testing
# Set DATABASE_URL to test database in CI/CD

TEST_DATABASE_URL="postgresql://postgres:password@test-db.supabase.co:5432/postgres"
```

Benefits:
- Complete isolation from production
- Can reset entire database between test runs
- No risk of affecting production data

### Option 2: Test Schema in Production Database

```sql
CREATE SCHEMA test_data;

-- Run tests in test_data schema
SET search_path TO test_data;

-- Drop entire schema after tests
DROP SCHEMA test_data CASCADE;
```

Benefits:
- Same database as production (catches environment issues)
- Easy to set up
- Still isolated from production data

### Option 3: Test Customer Accounts

```sql
-- Flag all test data
ALTER TABLE customers ADD COLUMN is_test BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN test_scenario_id TEXT;

-- Create test customers
INSERT INTO customers (email, name, is_test, test_scenario_id)
VALUES ('test-customer@example.test', 'Test Customer', true, 'test-scenario-123');

-- Clean up after tests
DELETE FROM customers WHERE test_scenario_id = 'test-scenario-123';
-- OR
DELETE FROM customers WHERE is_test = true;
```

Benefits:
- Can run in production database safely
- Easy to identify and clean up
- Realistic data patterns

## Performance Considerations

### Connection Pooling

```javascript
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,  // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Reuse pool across tests
export { pool };
```

### Query Optimization

```javascript
// BAD: N+1 query problem
for (const customer of customers) {
  const invoices = await queryDatabase(
    'SELECT * FROM invoices WHERE customer_id = $1',
    [customer.id]
  );
}

// GOOD: Single query with JOIN
const results = await queryDatabase(`
  SELECT c.*, json_agg(i.*) as invoices
  FROM customers c
  LEFT JOIN invoices i ON i.customer_id = c.id
  GROUP BY c.id
`);
```

### Parallel Test Execution

```javascript
// Ensure tests use isolated data to run in parallel
test.describe.configure({ mode: 'parallel' });

test.describe('Database Tests', () => {
  test('test 1', async () => {
    const customer = await createTestCustomer(); // Isolated data
    // Test logic
    await cleanupTestData(customer.id);
  });

  test('test 2', async () => {
    const customer = await createTestCustomer(); // Different isolated data
    // Test logic
    await cleanupTestData(customer.id);
  });
});
```
