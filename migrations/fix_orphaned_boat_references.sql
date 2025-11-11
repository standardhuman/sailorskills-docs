-- Migration: Fix Orphaned Boat References
-- Date: 2025-11-03
-- Issue: Dashboard showing "Unknown" boat names due to orphaned boat_id references
-- Root Cause: paint_repaint_schedule has no FK constraint, service_logs has orphaned records from Oct 7 migration

-- ============================================================================
-- PART 1: Clean up orphaned data
-- ============================================================================

-- Delete orphaned paint_repaint_schedule records (3 records from Oct 7 migration)
DELETE FROM paint_repaint_schedule
WHERE boat_id NOT IN (SELECT id FROM boats);

-- Delete orphaned service_logs records (12 records from Oct 7 migration)
DELETE FROM service_logs
WHERE boat_id IS NOT NULL
  AND boat_id NOT IN (SELECT id FROM boats);

-- ============================================================================
-- PART 2: Add foreign key constraint to prevent future orphans
-- ============================================================================

-- Add foreign key constraint to paint_repaint_schedule
-- Use SET NULL to preserve historical data when boats are deleted
ALTER TABLE paint_repaint_schedule
ADD CONSTRAINT fk_paint_repaint_schedule_boat_id
FOREIGN KEY (boat_id)
REFERENCES boats(id)
ON DELETE SET NULL;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify no orphaned records remain
SELECT
  'paint_repaint_schedule' as table_name,
  COUNT(*) as total_records,
  COUNT(prs.boat_id) as with_boat_id,
  COUNT(b.id) as with_valid_boat,
  COUNT(*) - COUNT(b.id) as orphaned
FROM paint_repaint_schedule prs
LEFT JOIN boats b ON prs.boat_id = b.id;

SELECT
  'service_logs' as table_name,
  COUNT(*) as total_records,
  COUNT(sl.boat_id) as with_boat_id,
  COUNT(b.id) as with_valid_boat,
  COUNT(sl.boat_id) - COUNT(b.id) as orphaned_non_null
FROM service_logs sl
LEFT JOIN boats b ON sl.boat_id = b.id;

-- Verify foreign key constraint was added
SELECT
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'paint_repaint_schedule'
  AND ccu.table_name = 'boats';
