-- Migration 021: Recalculate Pattern Dates
-- Date: 2025-11-05
-- Purpose: Fix pattern_date calculation to show current month, not skip to next month
--
-- Problem: calculatePatternDate() function returned NEXT future occurrence,
--          causing boats due in current month to skip to next month in forecast.
--
-- Solution: Recalculate pattern_date based on whether current month matches pattern,
--           not just the next future occurrence.
--
-- Usage: Run this monthly or when forecast shows incorrect boat counts

-- Function to calculate correct pattern date for a given reference month
-- Returns the pattern occurrence for the current cycle, not skipping ahead
CREATE OR REPLACE FUNCTION calculate_current_pattern_date(
  p_start_month INTEGER,        -- 1-12
  p_interval_months INTEGER,    -- 1, 2, 3, 6
  p_reference_date DATE DEFAULT CURRENT_DATE
) RETURNS DATE AS $$
DECLARE
  ref_year INTEGER;
  ref_month INTEGER;  -- 0-11 (JavaScript convention)
  pattern_start_month INTEGER;  -- 0-11
  candidate_date DATE;
BEGIN
  -- Handle invalid inputs
  IF p_start_month IS NULL OR p_interval_months IS NULL OR p_interval_months = 0 THEN
    RETURN NULL;
  END IF;

  ref_year := EXTRACT(YEAR FROM p_reference_date);
  ref_month := EXTRACT(MONTH FROM p_reference_date) - 1;  -- Convert to 0-11
  pattern_start_month := p_start_month - 1;  -- Convert to 0-11

  -- Start from pattern's start month in current year
  IF ref_month >= pattern_start_month THEN
    candidate_date := DATE (ref_year || '-' || LPAD(pattern_start_month + 1::TEXT, 2, '0') || '-01');
  ELSE
    candidate_date := DATE ((ref_year - 1) || '-' || LPAD(pattern_start_month + 1::TEXT, 2, '0') || '-01');
  END IF;

  -- Keep adding intervals until we reach or pass reference month
  -- But don't go MORE than one interval past the reference
  WHILE candidate_date + (p_interval_months || ' months')::INTERVAL <= p_reference_date LOOP
    candidate_date := candidate_date + (p_interval_months || ' months')::INTERVAL;
  END LOOP;

  -- Now candidate_date is the most recent pattern occurrence
  -- If it's in the past but within the current cycle, return it
  -- If it's too far past, return the next occurrence
  IF p_reference_date - candidate_date > (p_interval_months || ' months')::INTERVAL THEN
    -- We're past the grace period, return next occurrence
    RETURN candidate_date + (p_interval_months || ' months')::INTERVAL;
  ELSE
    -- We're within the current cycle, return this occurrence
    RETURN candidate_date;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Simpler approach: Just calculate pattern for current or next month
-- This matches the pattern logic that checks MOD(current_month - start_month, interval) = 0
UPDATE service_schedules
SET pattern_date = CASE
  -- Check if current month matches the pattern
  WHEN MOD((EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER - start_month + 12) % 12, interval_months) = 0
  THEN DATE_TRUNC('month', CURRENT_DATE)::DATE
  ELSE
    -- Find next occurrence after current month
    DATE_TRUNC('month', CURRENT_DATE)::DATE +
    (interval_months - MOD((EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER - start_month + 12) % 12, interval_months) || ' months')::INTERVAL
END,
updated_at = NOW()
WHERE is_active = true
  AND interval_months > 0;

-- Verify results
SELECT
  DATE_TRUNC('month', pattern_date)::DATE as month,
  COUNT(*) as boat_count
FROM service_schedules
WHERE is_active = true AND interval_months > 0
GROUP BY DATE_TRUNC('month', pattern_date)::DATE
ORDER BY month
LIMIT 6;

-- Show summary
SELECT
  'Migration 021 Complete' as status,
  COUNT(*) as total_updated,
  COUNT(*) FILTER (WHERE DATE_TRUNC('month', pattern_date) = DATE_TRUNC('month', CURRENT_DATE)) as current_month_boats
FROM service_schedules
WHERE is_active = true AND interval_months > 0;
