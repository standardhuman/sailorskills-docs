-- ============================================
-- COMBINED BACKFILL: Boat Length, Type, and Hull Type
-- ============================================
-- Run this in Supabase SQL Editor to fix missing boat data
-- URL: https://supabase.com/dashboard/project/fzygakldvvzxmahkdylq/sql/new
-- ============================================

-- 1. Backfill boat_length_ft from service_orders.service_details
WITH boat_lengths AS (
  SELECT DISTINCT ON (boat_id)
    boat_id,
    (service_details->>'boatLength')::NUMERIC as boat_length
  FROM service_orders
  WHERE boat_id IS NOT NULL
    AND service_details IS NOT NULL
    AND service_details->>'boatLength' IS NOT NULL
    AND (service_details->>'boatLength')::NUMERIC > 0
  ORDER BY boat_id, created_at DESC
)
UPDATE boats b
SET boat_length_ft = bl.boat_length
FROM boat_lengths bl
WHERE b.id = bl.boat_id
  AND (b.boat_length_ft IS NULL OR b.boat_length_ft = 0);

-- 2. Also update the old 'length' column for backward compatibility
UPDATE boats
SET length = boat_length_ft::INTEGER
WHERE boat_length_ft IS NOT NULL
  AND boat_length_ft > 0
  AND (length IS NULL OR length = 0);

-- 3. Backfill type (sailboat/powerboat) from service_orders.service_details
WITH boat_types AS (
  SELECT DISTINCT ON (boat_id)
    boat_id,
    service_details->>'boatType' as boat_type
  FROM service_orders
  WHERE boat_id IS NOT NULL
    AND service_details IS NOT NULL
    AND service_details->>'boatType' IS NOT NULL
  ORDER BY boat_id, created_at DESC
)
UPDATE boats b
SET type = bt.boat_type
FROM boat_types bt
WHERE b.id = bt.boat_id
  AND (b.type IS NULL OR b.type = '');

-- 4. Backfill hull_type (monohull/catamaran/trimaran) from service_orders.service_details
WITH hull_types AS (
  SELECT DISTINCT ON (boat_id)
    boat_id,
    service_details->>'hullType' as hull_type
  FROM service_orders
  WHERE boat_id IS NOT NULL
    AND service_details IS NOT NULL
    AND service_details->>'hullType' IS NOT NULL
  ORDER BY boat_id, created_at DESC
)
UPDATE boats b
SET hull_type = ht.hull_type
FROM hull_types ht
WHERE b.id = ht.boat_id
  AND (b.hull_type IS NULL OR b.hull_type = '');

-- Verification
DO $$
DECLARE
  total_boats INTEGER;
  boats_with_length INTEGER;
  boats_with_type INTEGER;
  boats_with_hull INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_boats FROM boats;
  SELECT COUNT(*) INTO boats_with_length FROM boats WHERE boat_length_ft IS NOT NULL AND boat_length_ft > 0;
  SELECT COUNT(*) INTO boats_with_type FROM boats WHERE type IS NOT NULL AND type != '';
  SELECT COUNT(*) INTO boats_with_hull FROM boats WHERE hull_type IS NOT NULL AND hull_type != '';

  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ BACKFILL COMPLETE!';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Results:';
  RAISE NOTICE '   Total boats: %', total_boats;
  RAISE NOTICE '   Boats with length: %', boats_with_length;
  RAISE NOTICE '   Boats with type: %', boats_with_type;
  RAISE NOTICE '   Boats with hull type: %', boats_with_hull;
  RAISE NOTICE '';
END $$;
