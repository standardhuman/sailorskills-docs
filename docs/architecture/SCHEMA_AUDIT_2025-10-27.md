# Database Schema Audit - October 27, 2025

**Audit Date:** 2025-10-27
**Tool:** `sailorskills-portal/scripts/test-helpers/example-check-schema.mjs`
**Database:** Supabase PostgreSQL (fzygakldvvzxmahkdylq)

---

## Executive Summary

Schema validation identified 4 issues. Upon investigation:
- ✅ **2 genuine gaps** - Missing columns that should be added
- ⚠️ **2 validation script errors** - Script expects wrong names

**Action Required:**
1. Add 2 missing columns via migrations
2. Fix schema validation script expectations

---

## Findings

### 1. service_logs.technician - MISSING (GENUINE)

**Status:** ❌ Missing column
**Impact:** Medium
**Used By:** Portal (displays service history)

**Current State:**
- Table exists with 27 columns
- Has `created_by` (TEXT) column
- Missing `technician` column

**Recommendation:**
Add `technician` column as alias or separate field:

**Option A (Alias):**
```sql
-- Make technician an alias for created_by
ALTER TABLE service_logs ADD COLUMN technician TEXT
  GENERATED ALWAYS AS (created_by) STORED;
```

**Option B (Separate Field):**
```sql
-- Add technician as separate field, copy from created_by
ALTER TABLE service_logs ADD COLUMN IF NOT EXISTS technician TEXT;
UPDATE service_logs SET technician = created_by WHERE technician IS NULL;
```

**Decision:** Use Option B - Separate field for flexibility

---

### 2. invoices.total - MISSING (GENUINE)

**Status:** ❌ Missing column
**Impact:** Low
**Used By:** Portal (invoice display)

**Current State:**
- Table exists with 21 columns
- Has `amount` (NUMERIC) column
- Missing `total` column

**Analysis:**
`amount` likely represents the invoice total already. The `total` column might be:
1. Redundant with `amount`
2. Intended as denormalized sum from `invoice_line_items`

**Current Usage Check:**
```sql
-- Check if invoice_line_items exists
SELECT COUNT(*) FROM invoice_line_items;
-- Result: Table exists with line items

-- Check if amount matches sum of line items
SELECT
  i.id,
  i.amount as invoice_amount,
  COALESCE(SUM(li.amount), 0) as line_items_total,
  i.amount - COALESCE(SUM(li.amount), 0) as difference
FROM invoices i
LEFT JOIN invoice_line_items li ON li.invoice_id = i.id
GROUP BY i.id, i.amount
HAVING i.amount - COALESCE(SUM(li.amount), 0) != 0;
```

**Recommendation:**
Add `total` as computed column or alias:

**Option A (Alias):**
```sql
-- Make total an alias for amount
ALTER TABLE invoices ADD COLUMN total NUMERIC
  GENERATED ALWAYS AS (amount) STORED;
```

**Option B (Denormalized Sum):**
```sql
-- Add total as denormalized sum from line items
-- (If invoices are built from line items)
ALTER TABLE invoices ADD COLUMN total NUMERIC;

-- Backfill from line items
UPDATE invoices i
SET total = (
  SELECT COALESCE(SUM(amount), i.amount)
  FROM invoice_line_items
  WHERE invoice_id = i.id
);

-- If no line items, use amount
UPDATE invoices SET total = amount WHERE total IS NULL;
```

**Decision:** Use Option A for now - Simple alias. Later can refactor if line items are the source of truth.

---

### 3. service_requests.customer_id - FALSE POSITIVE

**Status:** ✅ Column exists (different name)
**Impact:** None (validation script error)

**Current State:**
- Table has `customer_account_id` (UUID) - **Correct column name**
- Validation script expects `customer_id` - **Wrong expectation**

**Analysis:**
The table correctly uses `customer_account_id` to link to the `customer_accounts` table (Portal authentication).
This is distinct from `customer_id` which would link to the `customers` table (business records).

**Recommendation:**
Fix schema validation script to expect `customer_account_id`:

```javascript
// sailorskills-portal/scripts/test-helpers/example-check-schema.mjs
const REQUIRED_SCHEMA = {
  // ...
  service_requests: ['id', 'customer_account_id', 'status', 'created_at'], // Changed!
  // ...
};
```

---

### 4. messages table - FALSE POSITIVE

**Status:** ✅ Table exists (different name)
**Impact:** None (validation script error)

**Current State:**
- Table exists as `customer_messages` - **Correct table name**
- Validation script expects `messages` - **Wrong expectation**

**Analysis:**
The table is correctly named `customer_messages` to distinguish from potential admin messages or other messaging features.

**Recommendation:**
Fix schema validation script to expect correct table name:

```javascript
// sailorskills-portal/scripts/test-helpers/example-check-schema.mjs
const REQUIRED_SCHEMA = {
  // ...
  customer_messages: ['id', 'customer_account_id', 'content', 'created_at'], // Changed!
  // ...
};
```

---

## Action Plan

### Phase 1: Add Missing Columns (IMMEDIATE)

#### Migration 015: Add service_logs.technician
```sql
-- File: migrations/015_add_technician_to_service_logs.sql
ALTER TABLE service_logs
ADD COLUMN IF NOT EXISTS technician TEXT;

-- Backfill from created_by
UPDATE service_logs
SET technician = created_by
WHERE technician IS NULL;

-- Optional: Add index for queries
CREATE INDEX IF NOT EXISTS idx_service_logs_technician
ON service_logs(technician);
```

#### Migration 016: Add invoices.total
```sql
-- File: migrations/016_add_total_to_invoices.sql
-- Add as computed column (alias for amount)
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS total NUMERIC
GENERATED ALWAYS AS (amount) STORED;
```

### Phase 2: Fix Validation Script (IMMEDIATE)

Update `sailorskills-portal/scripts/test-helpers/example-check-schema.mjs`:

```javascript
const REQUIRED_SCHEMA = {
  customers: ['id', 'email', 'name', 'phone'],
  boats: ['id', 'customer_id', 'name', 'model', 'length'],
  service_logs: ['id', 'boat_id', 'service_date', 'technician'], // Already correct
  invoices: ['id', 'customer_id', 'total', 'status'], // Now 'total' will exist
  service_requests: ['id', 'customer_account_id', 'status', 'created_at'], // FIXED
  customer_messages: ['id', 'customer_account_id', 'content', 'created_at'] // FIXED
};
```

### Phase 3: Re-run Validation (VERIFY)

```bash
node sailorskills-portal/scripts/test-helpers/example-check-schema.mjs
```

Expected result: ✅ All tests passing

---

## Impact Analysis

### service_logs.technician

**Services Affected:**
- Portal (displays service history with technician name)
- Operations (may use for filtering/reporting)
- Dashboard (analytics by technician)

**Breaking Changes:** None (adding nullable column)

**Migration Risk:** Low
- Column is nullable
- Backfilled from existing `created_by`
- No foreign keys affected

### invoices.total

**Services Affected:**
- Portal (displays invoice totals)
- Dashboard (revenue calculations)
- Billing (may use for calculations)

**Breaking Changes:** None (adding computed column)

**Migration Risk:** Very Low
- Computed column (read-only)
- Automatically syncs with `amount`
- No data migration needed

---

## Verification Checklist

After running migrations:

- [ ] Run schema validation: `node example-check-schema.mjs`
- [ ] Verify Portal service history displays technician
- [ ] Verify Portal invoices display total
- [ ] Check Dashboard for any errors
- [ ] Test Billing invoice creation
- [ ] No errors in Supabase logs
- [ ] Update MIGRATION_SUMMARY.md with new migrations

---

## Additional Observations

### Positive Findings:
✅ All core tables exist (customers, boats, service_logs, invoices)
✅ Foreign keys properly established (most relationships)
✅ 55 tables total - comprehensive schema
✅ RLS policies in place for security

### Potential Future Issues:
⚠️ `service_logs` has 27 columns - Consider table splitting if grows larger
⚠️ JSONB columns (`propellers`, `anode_conditions`) - Ensure indexed for queries
⚠️ Multiple similar tables (`service_logs`, `service_history`, `service_conditions`) - Consider consolidation

---

## Related Documentation

- **MIGRATION_SUMMARY.md** - Complete migration history
- **PROJECT_STABILIZATION_PLAN.md** - Overall plan (Task 1.4)
- **DATABASE_ACCESS.md** - How to query database
- **RLS_FIX_SUMMARY.md** - Recent RLS policy fixes

---

**Audit Completed:** 2025-10-27
**Next Audit:** After migrations applied
**Auditor:** Claude Code (Stabilization Plan Phase 1)
