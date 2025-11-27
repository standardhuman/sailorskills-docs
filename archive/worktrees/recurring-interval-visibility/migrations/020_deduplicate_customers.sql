-- Migration: Deduplicate Customers by Email (Case-Insensitive)
-- Date: 2025-11-04
-- Purpose: Merge duplicate customer records caused by email case differences
-- IMPORTANT: This will update payments and invoices to point to the correct customer

-- Show duplicates before merge
SELECT '=== BEFORE DEDUPLICATION ===' as status;
SELECT COUNT(*) as total_customers FROM customers;
SELECT COUNT(*) as customers_with_boats FROM customers c WHERE EXISTS (SELECT 1 FROM boats b WHERE b.customer_id = c.id);

-- Create temporary table to track merges
CREATE TEMP TABLE customer_merges AS
WITH duplicates AS (
  SELECT
    LOWER(email) as email_lower,
    ARRAY_AGG(id ORDER BY
      -- Prefer customer with boats, then alphabetically first email
      (SELECT COUNT(*) FROM boats WHERE boats.customer_id = customers.id) DESC,
      email ASC
    ) as customer_ids
  FROM customers
  WHERE email IS NOT NULL AND email != ''
  GROUP BY LOWER(email)
  HAVING COUNT(*) > 1
)
SELECT
  email_lower,
  customer_ids[1] as keeper_id,  -- First ID (has boats or alphabetically first)
  UNNEST(customer_ids[2:]) as duplicate_id  -- All other IDs to be merged
FROM duplicates;

-- Show merge plan
SELECT '=== MERGE PLAN ===' as status;
SELECT
  cm.email_lower,
  c_keep.name as keeper_name,
  c_keep.email as keeper_email,
  c_dup.name as duplicate_name,
  c_dup.email as duplicate_email,
  (SELECT COUNT(*) FROM boats WHERE customer_id = cm.keeper_id) as keeper_boats,
  (SELECT COUNT(*) FROM boats WHERE customer_id = cm.duplicate_id) as dup_boats,
  (SELECT COUNT(*) FROM payments WHERE customer_id::uuid = cm.duplicate_id) as payments_to_move
FROM customer_merges cm
JOIN customers c_keep ON c_keep.id = cm.keeper_id
JOIN customers c_dup ON c_dup.id = cm.duplicate_id
ORDER BY payments_to_move DESC;

-- Update payments to point to keeper customer
UPDATE payments p
SET customer_id = cm.keeper_id::text
FROM customer_merges cm
WHERE p.customer_id::uuid = cm.duplicate_id;

-- Update invoices to point to keeper customer (if customer_id is UUID)
UPDATE invoices i
SET customer_id = cm.keeper_id::text
FROM customer_merges cm
WHERE i.customer_id::uuid = cm.duplicate_id;

-- Delete duplicate customers (now orphaned)
DELETE FROM customers c
WHERE EXISTS (
  SELECT 1 FROM customer_merges cm WHERE cm.duplicate_id = c.id
);

-- Show results
SELECT '=== AFTER DEDUPLICATION ===' as status;
SELECT COUNT(*) as total_customers FROM customers;
SELECT COUNT(*) as customers_with_boats FROM customers c WHERE EXISTS (SELECT 1 FROM boats b WHERE b.customer_id = c.id);
SELECT COUNT(DISTINCT LOWER(email)) as unique_emails FROM customers WHERE email IS NOT NULL;

-- Verify no payments lost
SELECT '=== VERIFICATION ===' as status;
SELECT COUNT(*) as total_payments FROM payments;
SELECT COUNT(*) as payments_with_valid_customer
FROM payments p
WHERE EXISTS (SELECT 1 FROM customers c WHERE c.id = p.customer_id::uuid);

-- Show remaining orphaned customers (should be much fewer)
SELECT '=== REMAINING ORPHANED CUSTOMERS ===' as status;
SELECT
  c.name,
  c.email,
  (SELECT COUNT(*) FROM payments WHERE customer_id::uuid = c.id) as payment_count
FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM boats b WHERE b.customer_id = c.id)
  AND EXISTS (SELECT 1 FROM payments p WHERE p.customer_id::uuid = c.id)
ORDER BY payment_count DESC
LIMIT 10;
