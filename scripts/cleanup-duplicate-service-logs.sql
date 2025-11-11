-- Cleanup Duplicate Service Logs
-- This script merges duplicate service_logs records that have the same boat_id and service_date
-- Strategy: Keep the earliest record, merge data from duplicates, then delete duplicates

-- First, let's see what we're dealing with
SELECT
  'Total duplicates to clean' as status,
  COUNT(*) as duplicate_groups
FROM (
  SELECT boat_id, service_date
  FROM service_logs
  WHERE boat_id IS NOT NULL AND service_date IS NOT NULL
  GROUP BY boat_id, service_date
  HAVING COUNT(*) > 1
) dupes;

-- Create a temporary table to track which records to keep and which to delete
CREATE TEMP TABLE duplicate_cleanup AS
WITH ranked_duplicates AS (
  SELECT
    id,
    boat_id,
    service_date,
    created_at,
    created_by,
    ROW_NUMBER() OVER (
      PARTITION BY boat_id, service_date
      ORDER BY created_at ASC
    ) as row_num
  FROM service_logs
  WHERE boat_id IS NOT NULL
    AND service_date IS NOT NULL
),
duplicate_groups AS (
  SELECT boat_id, service_date
  FROM ranked_duplicates
  GROUP BY boat_id, service_date
  HAVING COUNT(*) > 1
)
SELECT
  rd.id,
  rd.boat_id,
  rd.service_date,
  rd.row_num,
  CASE WHEN rd.row_num = 1 THEN 'KEEP' ELSE 'DELETE' END as action
FROM ranked_duplicates rd
INNER JOIN duplicate_groups dg
  ON rd.boat_id = dg.boat_id
  AND rd.service_date = dg.service_date;

-- Show what we're going to do
SELECT
  action,
  COUNT(*) as record_count
FROM duplicate_cleanup
GROUP BY action
ORDER BY action;

-- For each group, merge data from DELETE records into the KEEP record
DO $$
DECLARE
  keep_record RECORD;
  delete_record RECORD;
BEGIN
  -- Loop through each KEEP record
  FOR keep_record IN
    SELECT id, boat_id, service_date
    FROM duplicate_cleanup
    WHERE action = 'KEEP'
  LOOP
    -- Merge data from all DELETE records in the same group
    UPDATE service_logs
    SET
      -- Merge payment fields (prefer non-null)
      amount_charged = COALESCE(service_logs.amount_charged, (
        SELECT MAX(amount_charged)
        FROM service_logs sl
        WHERE sl.id IN (
          SELECT id FROM duplicate_cleanup
          WHERE boat_id = keep_record.boat_id
            AND service_date = keep_record.service_date
            AND action = 'DELETE'
        )
      )),
      payment_intent_id = COALESCE(service_logs.payment_intent_id, (
        SELECT MAX(payment_intent_id)
        FROM service_logs sl
        WHERE sl.id IN (
          SELECT id FROM duplicate_cleanup
          WHERE boat_id = keep_record.boat_id
            AND service_date = keep_record.service_date
            AND action = 'DELETE'
        )
      )),
      charge_id = COALESCE(service_logs.charge_id, (
        SELECT MAX(charge_id)
        FROM service_logs sl
        WHERE sl.id IN (
          SELECT id FROM duplicate_cleanup
          WHERE boat_id = keep_record.boat_id
            AND service_date = keep_record.service_date
            AND action = 'DELETE'
        )
      )),
      -- Merge condition fields (prefer non-null)
      paint_condition_overall = COALESCE(service_logs.paint_condition_overall, (
        SELECT MAX(paint_condition_overall)
        FROM service_logs sl
        WHERE sl.id IN (
          SELECT id FROM duplicate_cleanup
          WHERE boat_id = keep_record.boat_id
            AND service_date = keep_record.service_date
            AND action = 'DELETE'
        )
      )),
      growth_level = COALESCE(service_logs.growth_level, (
        SELECT MAX(growth_level)
        FROM service_logs sl
        WHERE sl.id IN (
          SELECT id FROM duplicate_cleanup
          WHERE boat_id = keep_record.boat_id
            AND service_date = keep_record.service_date
            AND action = 'DELETE'
        )
      )),
      -- Merge time fields
      time_in = COALESCE(service_logs.time_in, (
        SELECT MAX(time_in)
        FROM service_logs sl
        WHERE sl.id IN (
          SELECT id FROM duplicate_cleanup
          WHERE boat_id = keep_record.boat_id
            AND service_date = keep_record.service_date
            AND action = 'DELETE'
        )
      )),
      time_out = COALESCE(service_logs.time_out, (
        SELECT MAX(time_out)
        FROM service_logs sl
        WHERE sl.id IN (
          SELECT id FROM duplicate_cleanup
          WHERE boat_id = keep_record.boat_id
            AND service_date = keep_record.service_date
            AND action = 'DELETE'
        )
      )),
      total_hours = COALESCE(service_logs.total_hours, (
        SELECT MAX(total_hours)
        FROM service_logs sl
        WHERE sl.id IN (
          SELECT id FROM duplicate_cleanup
          WHERE boat_id = keep_record.boat_id
            AND service_date = keep_record.service_date
            AND action = 'DELETE'
        )
      )),
      -- Merge JSONB arrays (combine arrays)
      anode_conditions = COALESCE(service_logs.anode_conditions, '[]'::jsonb) || COALESCE((
        SELECT jsonb_agg(elem)
        FROM (
          SELECT DISTINCT jsonb_array_elements(anode_conditions) as elem
          FROM service_logs sl
          WHERE sl.id IN (
            SELECT id FROM duplicate_cleanup
            WHERE boat_id = keep_record.boat_id
              AND service_date = keep_record.service_date
              AND action = 'DELETE'
          )
          AND anode_conditions IS NOT NULL
        ) sub
      ), '[]'::jsonb),
      anodes_installed = COALESCE(service_logs.anodes_installed, '[]'::jsonb) || COALESCE((
        SELECT jsonb_agg(elem)
        FROM (
          SELECT DISTINCT jsonb_array_elements(anodes_installed) as elem
          FROM service_logs sl
          WHERE sl.id IN (
            SELECT id FROM duplicate_cleanup
            WHERE boat_id = keep_record.boat_id
              AND service_date = keep_record.service_date
              AND action = 'DELETE'
          )
          AND anodes_installed IS NOT NULL
        ) sub
      ), '[]'::jsonb),
      propellers = COALESCE(service_logs.propellers, '[]'::jsonb) || COALESCE((
        SELECT jsonb_agg(elem)
        FROM (
          SELECT DISTINCT jsonb_array_elements(propellers) as elem
          FROM service_logs sl
          WHERE sl.id IN (
            SELECT id FROM duplicate_cleanup
            WHERE boat_id = keep_record.boat_id
              AND service_date = keep_record.service_date
              AND action = 'DELETE'
          )
          AND propellers IS NOT NULL
        ) sub
      ), '[]'::jsonb),
      -- Merge notes (concatenate if both exist)
      notes = CASE
        WHEN service_logs.notes IS NOT NULL AND (
          SELECT string_agg(notes, E'\n---\n')
          FROM service_logs sl
          WHERE sl.id IN (
            SELECT id FROM duplicate_cleanup
            WHERE boat_id = keep_record.boat_id
              AND service_date = keep_record.service_date
              AND action = 'DELETE'
          )
          AND notes IS NOT NULL
        ) IS NOT NULL THEN service_logs.notes || E'\n---\n' || (
          SELECT string_agg(notes, E'\n---\n')
          FROM service_logs sl
          WHERE sl.id IN (
            SELECT id FROM duplicate_cleanup
            WHERE boat_id = keep_record.boat_id
              AND service_date = keep_record.service_date
              AND action = 'DELETE'
          )
          AND notes IS NOT NULL
        )
        ELSE COALESCE(service_logs.notes, (
          SELECT MAX(notes)
          FROM service_logs sl
          WHERE sl.id IN (
            SELECT id FROM duplicate_cleanup
            WHERE boat_id = keep_record.boat_id
              AND service_date = keep_record.service_date
              AND action = 'DELETE'
          )
        ))
      END
    WHERE id = keep_record.id;

    RAISE NOTICE 'Merged duplicates for boat % on date %', keep_record.boat_id, keep_record.service_date;
  END LOOP;
END $$;

-- Now delete the duplicate records
WITH deleted AS (
  DELETE FROM service_logs
  WHERE id IN (
    SELECT id FROM duplicate_cleanup WHERE action = 'DELETE'
  )
  RETURNING id
)
SELECT COUNT(*) as deleted_count FROM deleted;

-- Verify cleanup
SELECT
  'After cleanup' as status,
  COUNT(*) as remaining_duplicates
FROM (
  SELECT boat_id, service_date
  FROM service_logs
  WHERE boat_id IS NOT NULL AND service_date IS NOT NULL
  GROUP BY boat_id, service_date
  HAVING COUNT(*) > 1
) dupes;

-- Clean up temp table
DROP TABLE duplicate_cleanup;
