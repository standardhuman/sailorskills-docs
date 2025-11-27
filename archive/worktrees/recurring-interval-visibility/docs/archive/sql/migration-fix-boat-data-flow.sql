-- ============================================
-- MIGRATION: Fix Boat Data Flow Across Services
-- ============================================
-- This migration fixes the boat data flow issues by:
-- 1. Adding denormalized columns to boats table
-- 2. Adding propeller_count column
-- 3. Migrating existing data from old columns
-- 4. Backfilling propeller_count from service_orders
--
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Add new denormalized columns if they don't exist
DO $$
BEGIN
  RAISE NOTICE 'Step 1: Adding denormalized columns to boats table...';
END $$;

ALTER TABLE boats
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS boat_name TEXT,
  ADD COLUMN IF NOT EXISTS boat_make TEXT,
  ADD COLUMN IF NOT EXISTS boat_model TEXT,
  ADD COLUMN IF NOT EXISTS boat_year INTEGER,
  ADD COLUMN IF NOT EXISTS boat_length_ft NUMERIC,
  ADD COLUMN IF NOT EXISTS hull_material TEXT,
  ADD COLUMN IF NOT EXISTS marina_location TEXT,
  ADD COLUMN IF NOT EXISTS slip_number TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS propeller_count INTEGER;

-- Step 2: Migrate data from old columns to new columns
DO $$
BEGIN
  RAISE NOTICE 'Step 2: Migrating data from old columns to new denormalized columns...';

  -- Migrate name → boat_name
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'boats' AND column_name = 'name') THEN
    UPDATE boats SET boat_name = name WHERE boat_name IS NULL AND name IS NOT NULL;
    RAISE NOTICE '  ✓ Migrated name → boat_name';
  END IF;

  -- Migrate make → boat_make
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'boats' AND column_name = 'make') THEN
    UPDATE boats SET boat_make = make WHERE boat_make IS NULL AND make IS NOT NULL;
    RAISE NOTICE '  ✓ Migrated make → boat_make';
  END IF;

  -- Migrate model → boat_model
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'boats' AND column_name = 'model') THEN
    UPDATE boats SET boat_model = model WHERE boat_model IS NULL AND model IS NOT NULL;
    RAISE NOTICE '  ✓ Migrated model → boat_model';
  END IF;

  -- Migrate length → boat_length_ft
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'boats' AND column_name = 'length') THEN
    UPDATE boats SET boat_length_ft = length WHERE boat_length_ft IS NULL AND length IS NOT NULL;
    RAISE NOTICE '  ✓ Migrated length → boat_length_ft';
  END IF;

  -- Populate customer data from customers table
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'boats' AND column_name = 'customer_id') THEN
    UPDATE boats b
    SET
      customer_name = c.name,
      customer_email = c.email,
      customer_phone = c.phone
    FROM customers c
    WHERE b.customer_id = c.id
    AND (b.customer_name IS NULL OR b.customer_email IS NULL OR b.customer_phone IS NULL);
    RAISE NOTICE '  ✓ Populated customer data from customers table';
  END IF;
END $$;

-- Step 3: Backfill propeller_count from service_orders.service_details
DO $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Step 3: Backfilling propeller_count from service_orders...';

  -- Update boats with propeller_count from their most recent service order
  WITH boat_propellers AS (
    SELECT DISTINCT ON (boat_id)
      boat_id,
      (service_details->>'propellerCount')::INTEGER as propeller_count
    FROM service_orders
    WHERE boat_id IS NOT NULL
      AND service_details IS NOT NULL
      AND service_details->>'propellerCount' IS NOT NULL
    ORDER BY boat_id, created_at DESC
  )
  UPDATE boats b
  SET propeller_count = bp.propeller_count
  FROM boat_propellers bp
  WHERE b.id = bp.boat_id
    AND b.propeller_count IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '  ✓ Backfilled propeller_count for % boats', updated_count;
END $$;

-- Step 4: Create indexes for performance
DO $$
BEGIN
  RAISE NOTICE 'Step 4: Creating indexes for denormalized columns...';
END $$;

CREATE INDEX IF NOT EXISTS idx_boats_customer_email ON boats(customer_email);
CREATE INDEX IF NOT EXISTS idx_boats_boat_name ON boats(boat_name);
CREATE INDEX IF NOT EXISTS idx_boats_marina_location ON boats(marina_location);
CREATE INDEX IF NOT EXISTS idx_boats_is_active ON boats(is_active) WHERE is_active = TRUE;

-- Step 5: Verification queries
DO $$
DECLARE
  total_boats INTEGER;
  boats_with_names INTEGER;
  boats_with_length INTEGER;
  boats_with_propellers INTEGER;
  boats_with_customer_data INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'MIGRATION VERIFICATION';
  RAISE NOTICE '============================================';

  SELECT COUNT(*) INTO total_boats FROM boats;
  SELECT COUNT(*) INTO boats_with_names FROM boats WHERE boat_name IS NOT NULL;
  SELECT COUNT(*) INTO boats_with_length FROM boats WHERE boat_length_ft IS NOT NULL;
  SELECT COUNT(*) INTO boats_with_propellers FROM boats WHERE propeller_count IS NOT NULL;
  SELECT COUNT(*) INTO boats_with_customer_data FROM boats WHERE customer_name IS NOT NULL;

  RAISE NOTICE 'Total boats: %', total_boats;
  RAISE NOTICE 'Boats with names: %', boats_with_names;
  RAISE NOTICE 'Boats with length: %', boats_with_length;
  RAISE NOTICE 'Boats with propeller count: %', boats_with_propellers;
  RAISE NOTICE 'Boats with customer data: %', boats_with_customer_data;
  RAISE NOTICE '';

  IF boats_with_names < total_boats THEN
    RAISE WARNING '⚠️  % boats missing boat_name', (total_boats - boats_with_names);
  END IF;

  IF boats_with_length < total_boats THEN
    RAISE WARNING '⚠️  % boats missing boat_length_ft', (total_boats - boats_with_length);
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '✅ MIGRATION COMPLETE!';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 New columns added:';
  RAISE NOTICE '   - boat_name, boat_make, boat_model';
  RAISE NOTICE '   - boat_length_ft, boat_year, hull_material';
  RAISE NOTICE '   - customer_name, customer_email, customer_phone';
  RAISE NOTICE '   - marina_location, slip_number';
  RAISE NOTICE '   - is_active, propeller_count';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Old columns (name, make, model, length) still exist';
  RAISE NOTICE '   DO NOT drop them yet - needed during transition';
  RAISE NOTICE '';
END $$;
