-- ============================================
-- Staging Test Data Seed Script
-- ============================================
-- This script populates your staging database with realistic test data
-- for development and testing purposes.
--
-- Usage:
--   psql "$DATABASE_URL_STAGING" -f scripts/staging/seed-staging-data.sql
--
-- Or via Node.js script:
--   node scripts/staging/seed-staging-data.mjs
--
-- Safety:
--   - This script is IDEMPOTENT - safe to run multiple times
--   - Uses ON CONFLICT to avoid duplicates
--   - Only inserts if data doesn't exist
--
-- ============================================

BEGIN;

-- ============================================
-- TEST USERS (Supabase Auth)
-- ============================================
-- Note: These need to be created via Supabase Auth API or dashboard
-- because auth.users table is managed by Supabase Auth
-- Manual step: Create these users in Supabase Dashboard → Authentication

-- Users to create manually:
-- 1. test-admin@sailorskills.com (password: TestAdmin123!) - Admin role
-- 2. test-customer@sailorskills.com (password: TestCustomer123!) - Customer role
-- 3. test-field@sailorskills.com (password: TestField123!) - Field tech role

-- ============================================
-- TEST CUSTOMERS
-- ============================================

INSERT INTO customers (id, name, email, phone, address, city, state, zip, created_at)
VALUES
  ('test-customer-001', 'Test Marina Alpha', 'marina-alpha@test.sailorskills.com', '555-0001', '123 Harbor Way', 'Charleston', 'SC', '29401', NOW()),
  ('test-customer-002', 'Test Yacht Club Beta', 'yacht-beta@test.sailorskills.com', '555-0002', '456 Dock Street', 'Savannah', 'GA', '31401', NOW()),
  ('test-customer-003', 'Test Boat Services Gamma', 'services-gamma@test.sailorskills.com', '555-0003', '789 Marina Drive', 'Beaufort', 'SC', '29902', NOW()),
  ('test-customer-004', 'Test Private Owner Delta', 'owner-delta@test.sailorskills.com', '555-0004', '321 Ocean Avenue', 'Hilton Head', 'SC', '29928', NOW()),
  ('test-customer-005', 'Test Fleet Manager Epsilon', 'fleet-epsilon@test.sailorskills.com', '555-0005', '654 Port Boulevard', 'Charleston', 'SC', '29403', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- TEST BOATS
-- ============================================

INSERT INTO boats (id, customer_id, name, make, model, year, length, hull_type, propeller_type, created_at)
VALUES
  ('test-boat-001', 'test-customer-001', 'Sea Dream', 'Sea Ray', 'Sundancer', 2018, 42, 'fiberglass', 'dual-prop', NOW()),
  ('test-boat-002', 'test-customer-001', 'Ocean Voyager', 'Beneteau', 'Oceanis', 2020, 46, 'fiberglass', 'single-prop', NOW()),
  ('test-boat-003', 'test-customer-002', 'Wind Dancer', 'Catalina', '385', 2019, 38, 'fiberglass', 'folding-prop', NOW()),
  ('test-boat-004', 'test-customer-003', 'Rapid Transit', 'Boston Whaler', 'Outrage', 2021, 33, 'fiberglass', 'outboard', NOW()),
  ('test-boat-005', 'test-customer-004', 'Tranquility', 'Jeanneau', 'Sun Odyssey', 2017, 44, 'fiberglass', 'dual-prop', NOW()),
  ('test-boat-006', 'test-customer-005', 'Work Horse 1', 'Viking', 'Sport Cruiser', 2016, 52, 'fiberglass', 'dual-prop', NOW()),
  ('test-boat-007', 'test-customer-005', 'Work Horse 2', 'Viking', 'Sport Cruiser', 2016, 52, 'fiberglass', 'dual-prop', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- TEST SERVICE LOGS (Historical Services)
-- ============================================

INSERT INTO service_logs (
  id, customer_id, boat_id, service_date, service_type,
  overall_condition, notes, technician, created_at
)
VALUES
  (
    'test-service-001', 'test-customer-001', 'test-boat-001',
    NOW() - INTERVAL '30 days', 'anode_replacement',
    'good', 'Routine anode replacement, all systems nominal',
    'test-field@sailorskills.com', NOW() - INTERVAL '30 days'
  ),
  (
    'test-service-002', 'test-customer-002', 'test-boat-003',
    NOW() - INTERVAL '45 days', 'hull_cleaning',
    'fair', 'Moderate barnacle growth, cleaned thoroughly',
    'test-field@sailorskills.com', NOW() - INTERVAL '45 days'
  ),
  (
    'test-service-003', 'test-customer-003', 'test-boat-004',
    NOW() - INTERVAL '15 days', 'zincs_inspection',
    'excellent', 'All zincs in great condition',
    'test-field@sailorskills.com', NOW() - INTERVAL '15 days'
  ),
  (
    'test-service-004', 'test-customer-001', 'test-boat-002',
    NOW() - INTERVAL '60 days', 'anode_replacement',
    'poor', 'Significant anode deterioration, replaced all',
    'test-field@sailorskills.com', NOW() - INTERVAL '60 days'
  ),
  (
    'test-service-005', 'test-customer-004', 'test-boat-005',
    NOW() - INTERVAL '20 days', 'propeller_cleaning',
    'good', 'Propeller cleaned and inspected',
    'test-field@sailorskills.com', NOW() - INTERVAL '20 days'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- TEST INVOICES
-- ============================================

INSERT INTO invoices (
  id, customer_id, invoice_number, amount, status,
  due_date, service_date, description, created_at
)
VALUES
  (
    'test-invoice-001', 'test-customer-001', 'INV-2025-001', 450.00, 'paid',
    NOW() - INTERVAL '20 days', NOW() - INTERVAL '30 days',
    'Anode replacement service for Sea Dream', NOW() - INTERVAL '30 days'
  ),
  (
    'test-invoice-002', 'test-customer-002', 'INV-2025-002', 275.00, 'paid',
    NOW() - INTERVAL '35 days', NOW() - INTERVAL '45 days',
    'Hull cleaning for Wind Dancer', NOW() - INTERVAL '45 days'
  ),
  (
    'test-invoice-003', 'test-customer-003', 'INV-2025-003', 150.00, 'pending',
    NOW() + INTERVAL '15 days', NOW() - INTERVAL '15 days',
    'Zincs inspection for Rapid Transit', NOW() - INTERVAL '15 days'
  ),
  (
    'test-invoice-004', 'test-customer-001', 'INV-2025-004', 525.00, 'overdue',
    NOW() - INTERVAL '5 days', NOW() - INTERVAL '60 days',
    'Emergency anode replacement for Ocean Voyager', NOW() - INTERVAL '60 days'
  ),
  (
    'test-invoice-005', 'test-customer-004', 'INV-2025-005', 325.00, 'paid',
    NOW() - INTERVAL '10 days', NOW() - INTERVAL '20 days',
    'Propeller cleaning for Tranquility', NOW() - INTERVAL '20 days'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- TEST BOOKINGS (Upcoming Services)
-- ============================================

INSERT INTO bookings (
  id, customer_id, boat_id, scheduled_date,
  service_type, status, notes, created_at
)
VALUES
  (
    'test-booking-001', 'test-customer-005', 'test-boat-006',
    NOW() + INTERVAL '7 days', 'anode_replacement', 'confirmed',
    'Fleet service - Work Horse 1', NOW()
  ),
  (
    'test-booking-002', 'test-customer-005', 'test-boat-007',
    NOW() + INTERVAL '7 days', 'anode_replacement', 'confirmed',
    'Fleet service - Work Horse 2', NOW()
  ),
  (
    'test-booking-003', 'test-customer-001', 'test-boat-001',
    NOW() + INTERVAL '14 days', 'hull_cleaning', 'pending',
    'Regular maintenance', NOW()
  ),
  (
    'test-booking-004', 'test-customer-002', 'test-boat-003',
    NOW() + INTERVAL '21 days', 'propeller_cleaning', 'confirmed',
    'Pre-season service', NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- TEST INVENTORY (Sample Anode Products)
-- ============================================

INSERT INTO inventory (
  id, sku, name, category, quantity,
  unit_price, reorder_point, supplier, created_at
)
VALUES
  ('test-inv-001', 'ANODE-SHAFT-3', 'Shaft Anode 3"', 'anodes', 50, 15.99, 10, 'Marine Supply Co', NOW()),
  ('test-inv-002', 'ANODE-SHAFT-4', 'Shaft Anode 4"', 'anodes', 35, 19.99, 10, 'Marine Supply Co', NOW()),
  ('test-inv-003', 'ANODE-PROP-STD', 'Standard Prop Anode', 'anodes', 40, 12.99, 15, 'Marine Supply Co', NOW()),
  ('test-inv-004', 'ANODE-TRIM-TAB', 'Trim Tab Anode Set', 'anodes', 25, 22.99, 10, 'Marine Supply Co', NOW()),
  ('test-inv-005', 'CLEANER-HULL', 'Hull Cleaning Solution 1gal', 'cleaning', 20, 35.99, 5, 'Boat Care Inc', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SUMMARY
-- ============================================

DO $$
DECLARE
  customer_count INT;
  boat_count INT;
  service_count INT;
  invoice_count INT;
  booking_count INT;
  inventory_count INT;
BEGIN
  SELECT COUNT(*) INTO customer_count FROM customers WHERE id LIKE 'test-%';
  SELECT COUNT(*) INTO boat_count FROM boats WHERE id LIKE 'test-%';
  SELECT COUNT(*) INTO service_count FROM service_logs WHERE id LIKE 'test-%';
  SELECT COUNT(*) INTO invoice_count FROM invoices WHERE id LIKE 'test-%';
  SELECT COUNT(*) INTO booking_count FROM bookings WHERE id LIKE 'test-%';
  SELECT COUNT(*) INTO inventory_count FROM inventory WHERE id LIKE 'test-%';

  RAISE NOTICE '✅ Test data seeded successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Summary:';
  RAISE NOTICE '   - % test customers', customer_count;
  RAISE NOTICE '   - % test boats', boat_count;
  RAISE NOTICE '   - % test service logs', service_count;
  RAISE NOTICE '   - % test invoices', invoice_count;
  RAISE NOTICE '   - % test bookings', booking_count;
  RAISE NOTICE '   - % test inventory items', inventory_count;
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Test Users (create manually in Supabase Dashboard):';
  RAISE NOTICE '   - test-admin@sailorskills.com (TestAdmin123!)';
  RAISE NOTICE '   - test-customer@sailorskills.com (TestCustomer123!)';
  RAISE NOTICE '   - test-field@sailorskills.com (TestField123!)';
END $$;

COMMIT;
