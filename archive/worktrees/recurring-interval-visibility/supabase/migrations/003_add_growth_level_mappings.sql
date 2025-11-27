-- Growth Level Mappings Table
-- Configures how time since cleaning/painting maps to growth levels
-- This replaces hardcoded logic in the Estimator

CREATE TABLE IF NOT EXISTS growth_level_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paint_condition TEXT NOT NULL CHECK (paint_condition IN ('excellent', 'good', 'fair', 'poor', 'missing')),
  months_since_cleaning TEXT NOT NULL CHECK (months_since_cleaning IN ('0-2', '3-4', '5-6', '7-8', '9+')),
  expected_growth_level TEXT NOT NULL CHECK (expected_growth_level IN ('minimal', 'moderate', 'heavy', 'severe')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Unique constraint: one mapping per paint condition + time combination
  UNIQUE(paint_condition, months_since_cleaning)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_growth_mappings_lookup
  ON growth_level_mappings(paint_condition, months_since_cleaning);

-- Enable RLS
ALTER TABLE growth_level_mappings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can read (used by Estimator)
CREATE POLICY "Authenticated users can read growth mappings"
  ON growth_level_mappings FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Only admins can modify
CREATE POLICY "Admin only: growth_level_mappings"
  ON growth_level_mappings FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Populate with current hardcoded values from calculator.js
-- Paint Excellent
INSERT INTO growth_level_mappings (paint_condition, months_since_cleaning, expected_growth_level) VALUES
  ('excellent', '0-2', 'minimal'),
  ('excellent', '3-4', 'moderate'),
  ('excellent', '5-6', 'heavy'),
  ('excellent', '7-8', 'heavy'),
  ('excellent', '9+', 'severe');

-- Paint Good
INSERT INTO growth_level_mappings (paint_condition, months_since_cleaning, expected_growth_level) VALUES
  ('good', '0-2', 'minimal'),
  ('good', '3-4', 'moderate'),
  ('good', '5-6', 'heavy'),
  ('good', '7-8', 'heavy'),
  ('good', '9+', 'severe');

-- Paint Fair
INSERT INTO growth_level_mappings (paint_condition, months_since_cleaning, expected_growth_level) VALUES
  ('fair', '0-2', 'moderate'),
  ('fair', '3-4', 'heavy'),
  ('fair', '5-6', 'heavy'),
  ('fair', '7-8', 'severe'),
  ('fair', '9+', 'severe');

-- Paint Poor
INSERT INTO growth_level_mappings (paint_condition, months_since_cleaning, expected_growth_level) VALUES
  ('poor', '0-2', 'heavy'),
  ('poor', '3-4', 'heavy'),
  ('poor', '5-6', 'severe'),
  ('poor', '7-8', 'severe'),
  ('poor', '9+', 'severe');

-- Paint Missing
INSERT INTO growth_level_mappings (paint_condition, months_since_cleaning, expected_growth_level) VALUES
  ('missing', '0-2', 'severe'),
  ('missing', '3-4', 'severe'),
  ('missing', '5-6', 'severe'),
  ('missing', '7-8', 'severe'),
  ('missing', '9+', 'severe');

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_growth_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER growth_mappings_updated_at
  BEFORE UPDATE ON growth_level_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_growth_mappings_updated_at();

-- Update business_pricing_config to add missing MODERATE surcharge
-- Check if it exists first
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM business_pricing_config WHERE config_key = 'surcharge_moderate_growth') THEN
    INSERT INTO business_pricing_config (config_key, config_value, config_type, display_name, description, unit)
    VALUES (
      'surcharge_moderate_growth',
      15.00,
      'surcharge',
      'Moderate Growth',
      'Surcharge for moderate growth (15%)',
      'percentage'
    );
  END IF;
END $$;
