-- Backfill Script for Paul Roge's Boat "Grace"
-- Order: ORD-1761166799964-DOS7B
-- Run this in Supabase SQL Editor after migration 011 is applied

-- Step 1: Find Paul Roge's customer_id
SELECT id, name, email, phone
FROM customers
WHERE email = 'proge@berkeley.edu';

-- Step 2: Create boat record for "Grace"
-- IMPORTANT: Replace <customer_id> with the UUID from Step 1
INSERT INTO boats (
  customer_id,
  name,
  marina,
  dock,
  slip,
  customer_name,  -- backward compatibility
  customer_email, -- backward compatibility
  customer_phone, -- backward compatibility
  length,
  type,
  is_active,
  created_at
) VALUES (
  '<customer_id>',  -- ⚠️ REPLACE with Paul Roge's customer UUID
  'Grace',
  'Berkeley',
  'O',
  '605',
  'Paul Roge',
  'proge@berkeley.edu',
  '8318184769',
  0,  -- Length unknown from order email - can be updated later
  NULL,  -- Boat type unknown - can be updated later
  true,
  NOW()
) RETURNING id, name, marina, dock, slip;

-- Step 3: Link boat to service order
-- IMPORTANT: Replace <boat_id> with the UUID returned from Step 2
UPDATE service_orders
SET boat_id = '<boat_id>'  -- ⚠️ REPLACE with boat UUID from Step 2
WHERE order_number = 'ORD-1761166799964-DOS7B'
RETURNING order_number, boat_id, customer_id, service_type, estimated_amount;

-- Step 4: Verify the fix
-- This should now show Paul Roge with his boat Grace
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
  so.estimated_amount
FROM customers c
LEFT JOIN boats b ON b.customer_id = c.id
LEFT JOIN service_orders so ON so.customer_id = c.id
WHERE c.email = 'proge@berkeley.edu';
