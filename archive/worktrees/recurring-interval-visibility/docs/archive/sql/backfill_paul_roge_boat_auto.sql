-- Automated Backfill Script for Paul Roge's Boat "Grace"
-- This script will create the boat record and link it to the service order
-- Run this entire script at once in Supabase SQL Editor

-- Create boat record for "Grace" and link to service order
WITH customer_lookup AS (
  -- Find Paul Roge's customer_id
  SELECT id as customer_id
  FROM customers
  WHERE email = 'proge@berkeley.edu'
  LIMIT 1
),
boat_insert AS (
  -- Create boat record
  INSERT INTO boats (
    customer_id,
    name,
    marina,
    dock,
    slip,
    customer_name,
    customer_email,
    customer_phone,
    length,
    type,
    is_active,
    created_at
  )
  SELECT
    customer_id,
    'Grace',
    'Berkeley',
    'O',
    '605',
    'Paul Roge',
    'proge@berkeley.edu',
    '8318184769',
    0,
    NULL,
    true,
    NOW()
  FROM customer_lookup
  RETURNING id as boat_id, name, marina, dock, slip
)
-- Update service order to link the boat
UPDATE service_orders
SET boat_id = (SELECT boat_id FROM boat_insert)
WHERE order_number = 'ORD-1761166799964-DOS7B'
RETURNING order_number, boat_id, customer_id, service_type, estimated_amount;

-- Verify the fix worked
SELECT
  c.name as customer_name,
  c.email,
  c.phone,
  b.name as boat_name,
  b.marina,
  b.dock,
  b.slip,
  so.order_number,
  so.service_type,
  so.estimated_amount,
  so.status
FROM customers c
LEFT JOIN boats b ON b.customer_id = c.id
LEFT JOIN service_orders so ON so.customer_id = c.id
WHERE c.email = 'proge@berkeley.edu';
