-- Migration: Add enhanced fields from Notion export
-- Date: 2025-11-04
-- Purpose: Support full rebuild with all available Notion properties

-- Add portal and paint tracking fields to boats table
ALTER TABLE boats
  ADD COLUMN IF NOT EXISTS legacy_portal_url TEXT,
  ADD COLUMN IF NOT EXISTS youtube_playlist_url TEXT,
  ADD COLUMN IF NOT EXISTS paint_brand TEXT,
  ADD COLUMN IF NOT EXISTS paint_type TEXT,
  ADD COLUMN IF NOT EXISTS paint_model TEXT,
  ADD COLUMN IF NOT EXISTS last_paint_date DATE,
  ADD COLUMN IF NOT EXISTS estimated_repaint_date DATE,
  ADD COLUMN IF NOT EXISTS paint_condition_trend TEXT, -- 'improving', 'stable', 'declining'
  ADD COLUMN IF NOT EXISTS avg_service_duration_hours NUMERIC,
  ADD COLUMN IF NOT EXISTS base_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS charge_by TEXT, -- 'Length', 'Flat', 'Hourly'
  ADD COLUMN IF NOT EXISTS payment_processor TEXT; -- 'Stripe', 'Zoho'

-- Add comments for documentation
COMMENT ON COLUMN boats.legacy_portal_url IS 'URL to legacy Notion-based service portal (e.g., sailorskills.com/boat-name)';
COMMENT ON COLUMN boats.youtube_playlist_url IS 'URL to boat-specific YouTube playlist for service videos';
COMMENT ON COLUMN boats.paint_brand IS 'Bottom paint brand (e.g., Pettit, Interlux)';
COMMENT ON COLUMN boats.paint_type IS 'Paint type: Hard, Ablative, Hybrid';
COMMENT ON COLUMN boats.paint_model IS 'Specific paint model/product name';
COMMENT ON COLUMN boats.last_paint_date IS 'Date of most recent full repaint';
COMMENT ON COLUMN boats.estimated_repaint_date IS 'Calculated estimate for when repaint will be needed';
COMMENT ON COLUMN boats.paint_condition_trend IS 'Trend analysis: improving, stable, or declining';
COMMENT ON COLUMN boats.avg_service_duration_hours IS 'Average duration of service visits in hours';
COMMENT ON COLUMN boats.base_rate IS 'Base service rate for pricing';
COMMENT ON COLUMN boats.charge_by IS 'Billing method: Length, Flat, Hourly';
COMMENT ON COLUMN boats.payment_processor IS 'Payment system: Stripe, Zoho, etc.';

-- Create indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_boats_legacy_portal_url ON boats(legacy_portal_url) WHERE legacy_portal_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_boats_payment_processor ON boats(payment_processor) WHERE payment_processor IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_boats_paint_condition_trend ON boats(paint_condition_trend) WHERE paint_condition_trend IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_boats_estimated_repaint_date ON boats(estimated_repaint_date) WHERE estimated_repaint_date IS NOT NULL;

-- Verify migration
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'boats'
  AND column_name IN (
    'legacy_portal_url',
    'youtube_playlist_url',
    'paint_brand',
    'paint_type',
    'paint_model',
    'avg_service_duration_hours',
    'base_rate',
    'charge_by',
    'payment_processor'
  )
ORDER BY column_name;
